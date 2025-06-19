const { PipelineRepository } = require("../repositories/pipeline.repository");
const {
	DatabaseRepository,
} = require("../repositories/database.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");

const { runETL } = require("../utils/pipeline/run-etl.js");
const { timeHandler } = require("../utils/time-handler.util.js");
const { filterHandler } = require("../utils/filter-handler.util.js");
const { Connection } = require("../models/index.js");

class PipelineService {
	async find(data, response_type) {
		try {
			let result = {};
			switch (response_type) {
				case "summary":
					const { page, limit, ...others } = data;
					const filters = filterHandler([], others);
					const pagination = page && limit ? { page, limit } : undefined;

					result = await PipelineRepository.findMany(filters, pagination);
					break;
				case "detail":
					result = await PipelineRepository.findOne(data.id);
					break;
				default:
					throw new Error(`Unsupported type: ${response_type}`);
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

			const { sources, destinations, ...pipeline } = data;

			const createdRow = await PipelineRepository.create(pipeline, dbTrx);

			const configs = [
				...sources.map((src) => ({
					...src,
					pipeline_id: createdRow.pipeline_id,
					type: "src",
					timestamp: createdRow.timestamp,
				})),
				...destinations.map((dst) => ({
					...dst,
					pipeline_id: createdRow.pipeline_id,
					type: "dst",
					timestamp: createdRow.timestamp,
				})),
			];

			await PipelineRepository.upsertConfig(configs, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: {
						...createdRow.dataValues,
						configs: configs,
					},
					action: "create",
				},
				dbTrx
			);

			await dbTrx.commit();

			return await PipelineRepository.findOne(createdRow.pipeline_id);
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async update(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const { sources = [], destinations = [], ...pipeline } = data;

			let logModel = "";
			let logDatabaseIds = [];

			if (Object.keys(pipeline).length > 1) {
				await PipelineRepository.update(pipeline, dbTrx);
				logModel += "pipeline";
			}

			if (sources.length > 0 || destinations.length > 0) {
				const nowEpoch = timeHandler.nowEpoch();
				const databases = [
					...sources.map((src) => ({
						...src,
						pipeline_id: pipeline.pipeline_id,
						type: "src",
						timestamp: nowEpoch,
					})),
					...destinations.map((dst) => ({
						...dst,
						pipeline_id: pipeline.pipeline_id,
						type: "dst",
						timestamp: nowEpoch,
					})),
				];

				await PipelineRepository.upsertDatabases(databases, dbTrx);
				logModel +=
					logModel.length > 0 ? "& pipeline_database" : "pipeline_database";
				logDatabaseIds = databases.map((database) => database.database_id);
			}

			await LogRepository.create(
				{
					user_id: session.user_id,
					details: {
						model: logModel,
						ids: {
							pipeline: pipeline.pipeline_id,
							database: logDatabaseIds,
						},
					},
					action: "update",
					type: "user",
					timestamp: timeHandler.nowEpoch(),
				},
				dbTrx
			);

			await dbTrx.commit();

			return await PipelineRepository.findOne(pipeline.pipeline_id);
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async delete(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const { id: pipeline_id, database_id } = data;

			let deletedCount;
			if (database_id) {
				deletedCount = await PipelineRepository.deleteDatabase(
					pipeline_id,
					database_id,
					dbTrx
				);
			} else {
				deletedCount = await PipelineRepository.delete(pipeline_id, dbTrx);
			}

			if (deletedCount > 0) {
				await LogRepository.create(
					{
						user_id: session.user_id,
						details: {
							model: database_id
								? "pipeline & pipeline_database"
								: "pipeline_database",
							ids: database_id
								? {
										pipeline: pipeline_id,
										database: database_id,
								  }
								: pipeline_id,
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

	async execute(data) {
		try {
			let { pipeline_id, action, sources, destinations } = data;

			console.log(data);

			let payload;
			if (action === "run") {
				payload = await PipelineRepository.findForETL(pipeline_id);

				if (!payload) {
					throw Object.assign(new Error("Pipeline not found."), {
						code: 404,
					});
				}
			} else if (action === "preview") {
				// Parallel fetch untuk semua API preview
				const [srcDatabases, dstDatabases] = await Promise.all([
					Promise.all(
						sources.map(async (src) => ({
							database: await DatabaseRepository.findForPreview(
								src.database_id,
								"source"
							),
							configs: src.configs,
						}))
					),
					Promise.all(
						destinations.map(async (dst) => ({
							database: await DatabaseRepository.findForPreview(
								dst.database_id,
								"destination"
							),
							configs: dst.configs,
						}))
					),
				]);

				payload = {
					is_preview: true,
					sources: srcDatabases,
					destinations: dstDatabases,
				};
			} else {
				throw new Error(`Unsupported action: ${action}`);
			}

			const dataETL = await runETL(payload);

			// const result = {
			// 	log: dataETL.log,
			// 	data: dataETL.dst,
			// };
			return dataETL.log;
		} catch (error) {
			throw error;
		}
	}
}

module.exports = { PipelineService: new PipelineService() };
