const { LogRepository } = require("../repositories/log.repository.js");
const { filterHandler } = require("../utils/filter-handler.util.js");
const { Connection } = require("../models/index.js");

class LogService {
	async find(data, response_type) {
		try {
			let result = {};
			switch (response_type) {
				case "summary":
					const { page, limit, ...others } = data;
					const filters = filterHandler([], others);
					const pagination = page && limit ? { page, limit } : undefined;

					result = await LogRepository.findMany(filters, pagination);
					break;
				case "detail":
					result = await LogRepository.findOne(data.id);
					break;
				default:
					throw new Error(`Unsupported response type: ${response_type}`);
			}

			return result;
		} catch (error) {
			throw error;
		}
	}

	async delete(filter) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const deletedCount = await LogRepository.delete(filter, dbTrx);

			await dbTrx.commit();

			return { deleted_count: deletedCount };
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { LogService: new LogService() };
