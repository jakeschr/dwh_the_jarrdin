const {
	DatabaseRepository,
} = require("../repositories/database.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");

const { passwordHandler } = require("../utils/password-handler.util");
const { filterHandler } = require("../utils/filter-handler.util.js");
const { Connection } = require("../models/index.js");

class DatabaseService {
	async find(data, response_type) {
		try {
			let result = {};
			switch (response_type) {
				case "summary":
					const { page, limit, ...others } = data;
					const filters = filterHandler([], others);
					const pagination = page && limit ? { page, limit } : undefined;

					result = await DatabaseRepository.findMany(filters, pagination);
					break;
				case "detail":
					result = await DatabaseRepository.findOne(data.id);
					break;
				default:
					throw new Error(`Unsupported response type: ${response_type}`);
			}

			return result;
		} catch (error) {
			throw error;
		}
	}

	async create(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			data.password = await passwordHandler.encrypt(data.password);

			const createdRow = await DatabaseRepository.create(data, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: createdRow.dataValues,
					action: "create",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await DatabaseRepository.findOne(createdRow.database_id);

			return result;
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async update(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			if (data.password) {
				data.password = await passwordHandler.encrypt(data.password);
			}

			const updatedRow = await DatabaseRepository.update(data, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: updatedRow.dataValues,
					action: "update",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await DatabaseRepository.findOne(updatedRow.database_id);

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

			const deletedCount = await DatabaseRepository.delete(data.id, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: {
						deleted_count: deletedCount,
						id: data.id,
					},
					action: "delete",
				},
				dbTrx
			);

			await dbTrx.commit();

			return { deleted_count: deletedCount };
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { DatabaseService: new DatabaseService() };
