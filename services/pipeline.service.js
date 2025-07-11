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

			// await LogRepository.create(
			// 	{
			// 		actor_id: session.user_id,
			// 		details: createdRow.dataValues,
			// 		action: "create",
			// 	},
			// 	dbTrx
			// );

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

			// await LogRepository.create(
			// 	{
			// 		actor_id: session.user_id,
			// 		details: updatedRow.dataValues,
			// 		action: "update",
			// 	},
			// 	dbTrx
			// );

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

			// await LogRepository.create(
			// 	{
			// 		actor_id: session.user_id,
			// 		details: {
			// 			deleted_count: deletedCount,
			// 			id: data.id,
			// 		},
			// 		action: "delete",
			// 	},
			// 	dbTrx
			// );

			await dbTrx.commit();

			return { deleted_count: deletedCount };
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async execute(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			let { action, pipeline_id } = data;

			const pipeline = await PipelineRepository.findForETL(pipeline_id);

			// return pipeline

			const result = await runETL({
				source: pipeline.source,
				destination: pipeline.destination,
				is_preview: action === "preview" ? true : false,
			});

			// if (action === "run") {
			// 	await LogRepository.create(
			// 		{
			// 			actor_id: session.user_id,
			// 			details: result.log,
			// 			action: "execute",
			// 		},
			// 		dbTrx
			// 	);
			// }

			await dbTrx.commit();

			return result.log;
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { PipelineService: new PipelineService() };
