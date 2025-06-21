const {
	Connection,
	Sequelize,
	Op,
	DatabaseModel,
} = require("../models/index.js");
const { timeHandler } = require("../utils/time-handler.util.js");

class DatabaseRepository {
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
				attributes: [
					"database_id",
					"label",
					"database",
					"dialect",
					"is_active",
					"type",
				],
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await DatabaseModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await DatabaseModel.findAll(options);

				return {
					data: rows,
					meta: {
						total_record: count,
						current_page: page,
						total_page: Math.ceil(count / limit),
						size_page: limit,
					},
				};
			} else {
				const rows = await DatabaseModel.findAll(options);

				return { data: rows, meta: null };
			}
		} catch (error) {
			throw error;
		}
	}

	async findOne(databaseId) {
		try {
			const row = await DatabaseModel.findOne({
				where: { database_id: databaseId },
			});

			if (!row) {
				throw Object.assign(new Error("Database not found."), {
					code: 404,
				});
			}

			const formatResult = (row) => {
				return {
					database_id: row.database_id,
					label: row.label,
					database: row.database,
					dialect: row.dialect,
					host: row.host,
					port: row.port,
					username: row.username,
					password_saved: row.password ? true : false,
					driver: row.driver,
					dsn: row.dsn,
					schema: row.schema,
					connection_uri: row.connection_uri,
					options: JSON.parse(row.options),
					is_active: row.is_active,
					type: row.type,
					timestamp: timeHandler.epochToString(row.timestamp),
				};
			};

			return formatResult(row);
		} catch (error) {
			throw error;
		}
	}

	async findForConnection(databaseId) {
		try {
			const row = await DatabaseModel.findOne({
				where: { database_id: databaseId },
			});

			if (!row) {
				throw Object.assign(new Error("Database not found."), {
					code: 404,
				});
			}

			if (!row.is_active) {
				throw Object.assign(new Error(`Database ${row.label} not active.`), {
					code: 400,
				});
			}

			const formatResult = (row) => {
				return {
					database_id: row.database_id,
					label: row.label,
					database: row.database,
					dialect: row.dialect,
					host: row.host,
					port: row.port,
					username: row.username,
					password: row.password,
					driver: row.driver,
					dsn: row.dsn,
					schema: row.schema,
					connection_uri: row.connection_uri,
					options: JSON.parse(row.options),
					is_active: row.is_active,
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

			const row = await DatabaseModel.create(data, { transaction: dbTrx });

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

	async update(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			data.timestamp = timeHandler.nowEpoch();

			const { database_id, ...database } = data;

			const row = await DatabaseModel.findByPk(database_id);

			if (!row) {
				throw Object.assign(new Error("Database not found."), {
					code: 404,
				});
			}

			await row.update(database, { transaction: dbTrx });

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

	async delete(databaseId, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			const count = await DatabaseModel.destroy({
				where: { database_id: databaseId },
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

module.exports = { DatabaseRepository: new DatabaseRepository() };
