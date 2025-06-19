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

			const pipeline = {
				name: data.name,
				description: data.description,
				src_database_id: data.source.database_id,
				src_configs: data.source.configs,
				dst_database_id: data.destination.database_id,
				dst_configs: data.destination.configs,
			};

			const createdRow = await PipelineRepository.create(pipeline, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: createdRow.dataValues,
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

			const pipeline = {
				pipeline_id: data.pipeline_id,
				name: data?.name,
				description: data?.description,
				src_database_id: data?.source?.database_id,
				src_configs: data?.source?.configs,
				dst_database_id: data?.destination?.database_id,
				dst_configs: data?.destination?.configs,
			};

			const updatedRow = await PipelineRepository.update(pipeline, dbTrx);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: updatedRow.dataValues,
					action: "update",
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

			const deletedCount = await PipelineRepository.delete(data.id, dbTrx);

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
				const [srcPipelines, dstDatabases] = await Promise.all([
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
