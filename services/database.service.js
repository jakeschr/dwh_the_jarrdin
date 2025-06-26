const {
	DatabaseRepository,
} = require("../repositories/database.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");

const { queryHandler } = require("../utils/query-handler.util");
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

					try {
						if (result.password) {
							result.password = passwordHandler.decryptSymmetric(
								result.password
							);
						}

						const connection = await queryHandler.openConnection(config);

						result.info = await queryHandler.databaseInfo(
							connection,
							result.dialect,
							result.database
						);

						await queryHandler.closeConnection(connection, config.dialect);
					} catch (error) {
						result.info = null;
					}

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

			data.password = passwordHandler.encryptSymmetric(data.password);

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
				data.password = passwordHandler.encryptSymmetric(data.password);
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

	async connectionTest(data) {
		let connection = null;

		try {
			// Ambil data konfigurasi dari repository
			const config = await DatabaseRepository.findForConnection(data.id);

			// Dekripsi password jika ada
			if (config.password) {
				config.password = passwordHandler.decryptSymmetric(config.password);
			}

			// Lakukan koneksi
			connection = await queryHandler.open(config);

			let tableList;

			switch (config.dialect) {
				case "mysql": {
					const [rows] = await connection.query("SHOW TABLES");
					tableList = rows.map((row) => Object.values(row)[0]);
					break;
				}

				case "postgres": {
					const resPg = await connection.query(`
						SELECT tablename FROM pg_tables
						WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
					`);
					tableList = resPg.rows.map((row) => row.tablename);
					break;
				}

				case "sqlserver": {
					const resSql = await connection
						.request()
						.query(
							`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`
						);
					tableList = resSql.recordset.map((row) => row.TABLE_NAME);
					break;
				}

				case "oracle": {
					const resOra = await connection.execute(
						`SELECT table_name FROM user_tables`
					);
					tableList = resOra.rows.map(([name]) => name);
					break;
				}

				case "mongodb": {
					const db = connection.db(); // Get default database
					const collections = await db.listCollections().toArray();
					tableList = collections.map((col) => col.name);
					break;
				}

				case "sybase": {
					const resOdbc = await connection.query(`
						SELECT table_name 
						FROM systable 
						WHERE table_type = 'BASE' 
						  AND creator = USER_ID()
					`);
					tableList = resOdbc.map((row) => row.table_name);
					break;
				}

				default:
					throw new Error("Unsupported database type");
			}

			await queryHandler.close(connection, config.dialect);

			return {
				status: "success",
				message: `Berhasil mengambil daftar tabel dari ${config.label}`,
				data: tableList,
			};
		} catch (error) {
			throw error;
		}
	}

	async createTable(data) {
		let connection;
		try {
			const { database_id, tables } = data;

			const config = await DatabaseRepository.findForConnection(database_id);

			if (config.type !== "lake") {
				throw Object.assign(
					new Error("Hanya database dengan tipe 'lake' yang diperbolehkan."),
					{ code: 400 }
				);
			}

			if (config.password) {
				config.password = passwordHandler.decryptSymmetric(config.password);
			}

			connection = await queryHandler.openConnection(config);

			const query = await queryHandler.createTable(tables, connection);

			await queryHandler.closeConnection(connection, config.dialect);

			return {
				status: "success",
				message: `Berhasil membuat ${tables.length} tabel di database lake.`,
				query: query,
			};
		} catch (error) {
			if (connection) {
				await connection.query("ROLLBACK");
			}
			throw error;
		}
	}
}

module.exports = { DatabaseService: new DatabaseService() };
