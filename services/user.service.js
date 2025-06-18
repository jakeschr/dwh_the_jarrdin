const { UserRepository } = require("../repositories/user.repository");
const { LogRepository } = require("../repositories/log.repository");

const { passwordHandler } = require("../utils/password-handler.util");
const { filterHandler } = require("../utils/filter-handler.util.js");
const { Connection } = require("../models/index.js");

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
					actor_id: session.user_id,
					details: updatedRow.dataValues,
					action: "update",
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

	async signup(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const existing = await UserRepository.findExisting({
				email: data.email,
			});

			if (existing) {
				throw Object.assign(new Error("User with this email already exists."), {
					code: 409,
				});
			}

			data.password = await passwordHandler.encrypt(data.password);

			const createdRow = await UserRepository.create(data, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: createdRow.dataValues,
					action: "signup",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await UserRepository.findOne(createdRow.user_id);

			return result;
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async signin(data, req) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const existing = await UserRepository.findExisting({
				email: data.email,
			});

			if (!existing) {
				throw Object.assign(new Error("User not found."), {
					code: 404,
				});
			}

			if (!existing.is_active) {
				throw Object.assign(new Error("Your account is inactive"), {
					code: 400,
				});
			}

			const isValid = await passwordHandler.verify(
				existing.password,
				data.password
			);

			if (!isValid) {
				throw Object.assign(new Error("Invalid password."), { code: 401 });
			}

			req.session.user = {
				user_id: existing.user_id,
				email: existing.email,
				role: existing.role,
			};

			await LogRepository.create(
				{
					actor_id: existing.user_id,
					details: req.session,
					action: "signin",
				},
				dbTrx
			);

			await dbTrx.commit();

			return { message: "Signin successful", session: req.session };
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async signout(req, res) {
		try {
			return new Promise((resolve, reject) => {
				req.session.destroy((err) => {
					if (err) {
						return reject(
							Object.assign(new Error("Signout failed."), { code: 500 })
						);
					}

					res.clearCookie(process.env.SESSION_NAME || "connect.sid");

					resolve({ message: "Signout successful." });
				});
			});
		} catch (error) {
			throw error;
		}
	}
}

module.exports = { UserService: new UserService() };
