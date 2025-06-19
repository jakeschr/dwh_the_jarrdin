const {
	DatabaseRepository,
} = require("../repositories/database.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");

const { connectionHandler } = require("../utils/connection-handler.util");
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

	async testConnection(data) {
		let connectionObj = null;

		try {
			// Ambil data konfigurasi dari repository
			const config = await DatabaseRepository.findForConnection(data.id);

			// Dekripsi password jika ada
			if (config.password) {
				config.password = passwordHandler.decryptSymmetric(config.password);
			}

			// Lakukan koneksi
			connectionObj = await connectionHandler.open(config);

			const { connection, type } = connectionObj;

			let tableList;

			switch (type) {
				case "mysql":
					[tableList] = await connection.query("SHOW TABLES");
					break;

				case "postgres":
					const resPg = await connection.query(`
					SELECT tablename FROM pg_tables
					WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
				`);
					tableList = resPg.rows;
					break;

				case "sqlserver":
					const resSql = await connection
						.request()
						.query(
							`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`
						);
					tableList = resSql.recordset;
					break;

				case "oracle":
					const resOra = await connection.execute(
						`SELECT table_name FROM user_tables`
					);
					tableList = resOra.rows.map(([name]) => ({ table_name: name }));
					break;

				case "mongodb":
					const db = connection.db(); // Get default database
					const collections = await db.listCollections().toArray();
					tableList = collections.map((col) => ({ collection_name: col.name }));
					break;

				case "odbc":
					// Banyak DB ODBC support metadata standard ini:
					const resOdbc = await connection.query(`
					SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
				`);
					tableList = resOdbc;
					break;

				default:
					throw new Error("Unsupported database type");
			}

			await connectionHandler.close(connectionObj);

			return {
				status: "success",
				message: `Berhasil mengambil daftar tabel dari ${config.label}`,
				data: tableList,
			};
		} catch (error) {
			// Jika error, kirim pesan gagal
			if (connectionObj) {
				await connectionHandler.close(connectionObj);
			}

			throw error;
		}
	}
}

module.exports = { DatabaseService: new DatabaseService() };
