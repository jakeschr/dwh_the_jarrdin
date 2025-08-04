const {
	Connection,
	Sequelize,
	Op,
	PipelineModel,
	DatabaseModel,
} = require("../models/index.js");

const { timeHandler } = require("../utils/time-handler.util.js");
const { passwordHandler } = require("../utils/password-handler.util");

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
				include: [
					{
						model: DatabaseModel,
						required: true,
						attributes: ["database_id", "label"],
						as: "src_db",
					},
					{
						model: DatabaseModel,
						required: true,
						attributes: ["database_id", "label"],
						as: "dst_db",
					},
				],
			};

			const formatResult = (rows) => {
				return rows.map((pipeline) => ({
					pipeline_id: pipeline.pipeline_id,
					name: pipeline.name,
					source: pipeline.src_db.label,
					destination: pipeline.dst_db.label,
				}));
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await PipelineModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await PipelineModel.findAll(options);

				return {
					data: formatResult(rows),
					meta: {
						total_record: count,
						current_page: page,
						total_page: Math.ceil(count / limit),
						size_page: limit,
					},
				};
			} else {
				const rows = await PipelineModel.findAll(options);

				return { data: formatResult(rows), meta: null };
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
						model: DatabaseModel,
						required: true,
						attributes: ["database_id", "label"],
						as: "src_db",
					},
					{
						model: DatabaseModel,
						required: true,
						attributes: ["database_id", "label"],
						as: "dst_db",
					},
				],
			});

			if (!row) {
				throw Object.assign(new Error("Pipeline not found."), {
					code: 404,
				});
			}

			const formatResult = (row) => {
				return {
					pipeline_id: row.pipeline_id,
					name: row.name,
					description: row.description,
					src_db: row.src_db,
					dst_db: row.dst_db,
					pipelines: row.pipelines,
					timestamp: timeHandler.epochToString(row.timestamp),
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
				include: [
					{
						model: DatabaseModel,
						required: true,
						as: "src_db",
					},
					{
						model: DatabaseModel,
						required: true,
						as: "dst_db",
					},
				],
			});

			if (!row) {
				throw Object.assign(new Error("Pipeline not found."), {
					code: 404,
				});
			}

			if (!row.src_db.is_active) {
				throw Object.assign(
					new Error(`Database source '${row.src_db.label}' not active.`),
					{
						code: 400,
					}
				);
			}

			if (!row.dst_db.is_active) {
				throw Object.assign(
					new Error(`Database destination '${row.dst_db.label}' not active.`),
					{
						code: 400,
					}
				);
			}

			const formatResult = (row) => {
				if (row.src_db.password) {
					row.src_db.password = passwordHandler.decryptSymmetric(
						row.src_db.password
					);
				}

				if (row.dst_db.password) {
					row.dst_db.password = passwordHandler.decryptSymmetric(
						row.dst_db.password
					);
				}

				return {
					pipeline_id: row.pipeline_id,
					name: row.name,
					src_db: row.src_db,
					dst_db: row.dst_db,
					pipelines: row.pipelines,
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
