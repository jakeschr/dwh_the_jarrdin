const {
	Connection,
	Sequelize,
	Op,
	LogModel,
	UserModel,
	JobModel,
} = require("../models/index.js");
const { timeHandler } = require("../utils/time-handler.util.js");

class LogRepository {
	async handleTransaction(dbTrxGlobal) {
		if (dbTrxGlobal) {
			return dbTrxGlobal;
		}
		return await Connection.transaction();
	}

	async findMany(filters, pagination) {
		try {
			const options = {
				where: filters,
			};

			const formatResult = (rows) => {
				return rows.map((row) => {
					return {
						log_id: row.log_id,
						...(row.type === "user"
							? { user_id: row.user_id }
							: { job_id: row.job_id }),
						action: row.action,
						type: row.type,
						timestamp: timeHandler.epochToString(row.timestamp),
					};
				});
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await LogModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await LogModel.findAll(options);

				return {
					data: formatResult(rows),
					meta: {
						current_page: page,
						total_pages: Math.ceil(count / limit),
						page_size: limit,
						total_records: count,
					},
				};
			} else {
				const rows = await LogModel.findAll(options);

				return { data: formatResult(rows), meta: null };
			}
		} catch (error) {
			throw error;
		}
	}

	async findOne(logId) {
		try {
			const row = await LogModel.findOne({
				where: { log_id: logId },
				include: [
					{
						model: UserModel,
						required: false,
						attributes: ["user_id", "name"],
					},
					{
						model: JobModel,
						required: false,
						attributes: ["job_id", "name"],
					},
				],
			});

			if (!row) {
				throw Object.assign(new Error("log not found."), {
					code: 404,
				});
			}

			const formatResult = (row) => {
				return {
					log_id: row.log_id,
					...(row.type === "user"
						? { user_id: row.user.user_id, name: row.user.name }
						: { job_id: row.job.job_id, name: row.job.name }),
					details: JSON.parse(row.details),
					action: row.action,
					type: row.type,
					timestamp: timeHandler.epochToString(row.timestamp),
				};
			};

			return formatResult(row);
		} catch (error) {
			throw error;
		}
	}

	async create(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			data.timestamp = timeHandler.nowEpoch();

			const row = await LogModel.create(data, { transaction: dbTrx });

			if (!dbTrxGlobal) await dbTrx.commit();

			return row;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();

			if (error instanceof Sequelize.UniqueConstraintError) {
				throw Object.assign(new Error(error.errors[0].message), { code: 400 });
			}

			throw error;
		}
	}

	async delete(filter, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			const count = await LogModel.destroy({
				where: filter,
				transaction: dbTrx,
			});

			if (!dbTrxGlobal) await dbTrx.commit();

			return count;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { LogRepository: new LogRepository() };
