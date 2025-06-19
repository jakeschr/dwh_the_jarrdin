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

			let testResult;

			switch (type) {
				case "mysql":
					[testResult] = await connection.query("SELECT 1 AS test");
					break;

				case "postgres":
					const resPg = await connection.query("SELECT 1 AS test");
					testResult = resPg.rows;
					break;

				case "sqlserver":
					const resSql = await connection.request().query("SELECT 1 AS test");
					testResult = resSql.recordset;
					break;

				case "oracle":
					const resOra = await connection.execute("SELECT 1 AS test FROM DUAL");
					testResult = resOra.rows;
					break;

				case "mongodb":
					const admin = connection.db().admin();
					const ping = await admin.ping();
					testResult = [ping];
					break;

				case "odbc":
					const resOdbc = await connection.query("SELECT 1 AS test");
					testResult = resOdbc;
					break;

				default:
					throw new Error("Unsupported database type");
			}

			// Jika berhasil sampai sini, koneksi sukses
			await connectionHandler.close(connectionObj);

			return {
				status: "success",
				message: `Koneksi ke ${config.label} berhasil.`,
				data: testResult,
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
