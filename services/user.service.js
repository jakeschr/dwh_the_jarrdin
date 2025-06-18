const { UserRepository } = require("../repositories/user.repository");
const { LogRepository } = require("../repositories/log.repository");
const { Connection } = require("../models/index.js");

const { passwordHandler } = require("../utils/password-handler.util");
const { filterHandler } = require("../utils/filter-handler.util.js");

class UserService {
	async find(data, response_type) {
		try {
			let result = {};
			switch (response_type) {
				case "summary":
					const { page, limit, ...others } = data;
					const filters = filterHandler([], others);
					const pagination = page && limit ? { page, limit } : undefined;

					result = await UserRepository.findMany(filters, pagination);
					break;
				case "detail":
					result = await UserRepository.findOne(data.id);
					break;
				case "profile":
					result = await UserRepository.findOne(data.user_id);
					break;
				default:
					throw new Error(`Unsupported response type: ${response_type}`);
			}

			return result;
		} catch (error) {
			throw error;
		}
	}

	async update(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			if (data.role && session.role !== "admin") {
				throw Object.assign(
					new Error("You are not authorized to update user role."),
					{
						code: 403,
					}
				);
			}

			if (data.password) {
				const existing = await UserRepository.findExisting({
					user_id: data.user_id,
				});

				if (!existing) {
					throw Object.assign(new Error("User not found."), {
						code: 404,
					});
				}

				const isValid = await passwordHandler.verify(
					existing.password,
					data.password.old
				);

				if (!isValid) {
					throw Object.assign(new Error("Invalid old password."), {
						code: 400,
					});
				}

				data.password = await passwordHandler.encrypt(data.password.new);
			}

			const updatedRow = await UserRepository.update(data, dbTrx);

			await LogRepository.create(
				{
					user_id: session.user_id,
					details: {
						model: "user",
						ids: updatedRow.user_id,
					},
					action: "update",
					type: "user",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await UserRepository.findOne(updatedRow.user_id);

			return result;
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async delete(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const deletedCount = await UserRepository.delete(data.id, dbTrx);

			if (deletedCount > 0 && data.id !== session.user_id) {
				await LogRepository.create(
					{
						user_id: session.user_id,
						details: {
							model: "user",
							ids: data.id,
						},
						action: "delete",
						type: "user",
					},
					dbTrx
				);
			}

			await dbTrx.commit();

			return { deleted_count: deletedCount };
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { UserService: new UserService() };
