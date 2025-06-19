const {
	Connection,
	Sequelize,
	Op,
	PipelineModel,
	PipelineConfigModel,
	DatabaseModel,
} = require("../models/index.js");

const { timeHandler } = require("../utils/time-handler.util.js");

class PipelineRepository {
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
				attributes: ["pipeline_id", "name"],
				raw: true,
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await PipelineModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await PipelineModel.findAll(options);

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
				const rows = await PipelineModel.findAll(options);

				return { data: rows, meta: null };
			}
		} catch (error) {
			throw error;
		}
	}

	async findOne(pipelineId) {
		try {
			const row = await PipelineModel.findOne({
				where: { pipeline_id: pipelineId },
				include: [
					{
						model: PipelineConfigModel,
						required: true,
						include: [
							{
								model: DatabaseModel,
								required: true,
								attributes: ["database_id", "label"],
							},
						],
					},
				],
			});

			if (!row) {
				throw Object.assign(new Error("Pipeline not found."), {
					code: 404,
				});
			}

			const formatResult = (pipeline) => {
				const grouped = { src: [], dst: [] };
				for (const item of pipeline.pipeline_databases) {
					const formatted = {
						database: item.database,
						configs: JSON.parse(item.configs),
					};

					if (grouped[item.type]) {
						grouped[item.type].push(formatted);
					}
				}
				return {
					pipeline_id: pipeline.pipeline_id,
					name: pipeline.name,
					description: pipeline.description,
					sources: grouped.src,
					destinations: grouped.dst,
					timestamp: timeHandler.epochToString(pipeline.timestamp),
				};
			};

			return formatResult(row);
		} catch (error) {
			throw error;
		}
	}

	async findForETL(pipelineId) {
		try {
			const row = await PipelineModel.findOne({
				where: { pipeline_id: pipelineId },
				attributes: ["pipeline_id"],
				include: [
					{
						model: PipelineConfigModel,
						required: true,
						attributes: ["configs", "type"],
						include: [
							{
								model: DatabaseModel,
								required: true,
							},
						],
					},
				],
			});

			const formatResult = (pipeline) => {
				const grouped = { src: [], dst: [] };

				for (const item of pipeline.pipeline_databases) {
					const db = item.database;

					const formatted = {
						database: {
							database_id: db.database_id,
							label: db.label,
							database: db.database,
							dialect: db.dialect,
							host: db.host,
							port: db.port,
							username: db.username,
							password: db.password,
							driver: db.driver,
							dsn: db.dsn,
							schema: db.schema,
							connection_uri: db.connection_uri,
							options: JSON.parse(db.options),
						},
						configs: JSON.parse(item.configs),
					};

					if (grouped[item.type]) {
						grouped[item.type].push(formatted);
					}
				}
				return {
					pipeline_id: pipeline.pipeline_id,
					is_preview: false,
					sources: grouped.src,
					destinations: grouped.dst,
				};
			};

			return row ? formatResult(row) : null;
		} catch (error) {
			throw error;
		}
	}

	async create(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			data.timestamp = timeHandler.nowEpoch();

			const row = await PipelineModel.create(data, {
				transaction: dbTrx,
			});

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

			const { pipeline_id, ...pipeline } = data;

			const row = await PipelineModel.findByPk(pipeline_id);

			if (!row) {
				throw Object.assign(new Error("Pipeline not found."), {
					code: 404,
				});
			}

			await row.update(pipeline, { transaction: dbTrx });

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

	async delete(pipelineId, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			const deletedCount = await PipelineModel.destroy({
				where: { pipeline_id: pipelineId },
				transaction: dbTrx,
			});

			if (deletedCount === 0) {
				throw Object.assign(new Error("Pipeline not found."), { code: 404 });
			}

			if (!dbTrxGlobal) await dbTrx.commit();

			return deletedCount;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();

			if (error instanceof Sequelize.ForeignKeyConstraintError) {
				throw Object.assign(
					new Error(
						"Cannot delete: this pipeline is still used in other records."
					),
					{ code: 409 }
				);
			}

			throw error;
		}
	}
}

module.exports = { PipelineRepository: new PipelineRepository() };
