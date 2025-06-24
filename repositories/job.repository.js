const {
	Connection,
	Sequelize,
	Op,
	JobModel,
	PipelineModel,
	DatabaseModel,
} = require("../models");

const { timeHandler } = require("../utils/time-handler.util.js");

class JobRepository {
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
				attributes: ["job_id", "name", "cron", "time_threshold", "is_active"],
				include: [
					{
						model: PipelineModel,
						required: true,
						attribute: ["pipeline_id", "name"],
					},
				],
			};

			const formatResult = (rows) => {
				return rows.map((job) => ({
					job_id: job.job_id,
					name: job.name,
					pipeline: job.pipeline.name,
					cron: job.cron,
					time_threshold: timeHandler.epochToString(job.time_threshold),
					is_active: job.is_active,
				}));
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await JobModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await JobModel.findAll(options);

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
				const rows = await JobModel.findAll(options);

				return { data: formatResult(rows), meta: null };
			}
		} catch (error) {
			throw error;
		}
	}

	async findOne(jobId) {
		try {
			const row = await JobModel.findOne({
				where: { job_id: jobId },
				include: [
					{
						model: PipelineModel,
						required: true,
						attributes: ["pipeline_id", "name"],
					},
				],
			});

			if (!row) {
				throw Object.assign(new Error("Job not found."), {
					code: 404,
				});
			}

			const formatResult = (job) => {
				return {
					job_id: job.job_id,
					name: job.name,
					description: job.description,
					cron: job.cron,
					time_threshold: timeHandler.epochToString(job.time_threshold),
					pipeline: job.pipeline,
					is_active: job.is_active,
					timestamp: timeHandler.epochToString(job.timestamp),
				};
			};

			return formatResult(row);
		} catch (error) {
			throw error;
		}
	}

	async findForETL(jobId) {
		try {
			const row = await JobModel.findOne({
				where: { job_id: jobId },
				include: [
					{
						model: PipelineModel,
						required: true,
						attributes: ["pipeline_id"],
						include: [
							{
								model: DatabaseModel,
								required: true,
								as: "src_db",
								where: { is_active: true },
							},
							{
								model: DatabaseModel,
								required: true,
								as: "dst_db",
								where: { is_active: true },
							},
						],
					},
				],
			});

			const formatResult = (row) => {
				const { job_id, is_active, time_threshold, pipeline } = row;
				const { src_configs, src_db, dst_configs, dst_db } = pipeline;

				return {
					job_id: job_id,
					is_active: is_active,
					source: {
						database: {
							database_id: src_db.database_id,
							label: src_db.label,
							database: src_db.database,
							dialect: src_db.dialect,
							host: src_db.host,
							port: src_db.port,
							username: src_db.username,
							password: src_db.password
								? passwordHandler.decryptSymmetric(src_db.password)
								: null,
							driver: src_db.driver,
							dsn: src_db.dsn,
							schema: src_db.schema,
							connection_uri: src_db.connection_uri,
							options: JSON.parse(src_db.options),
							type: src_db.type,
						},
						configs: JSON.parse(src_configs),
					},
					destination: {
						database: {
							database_id: dst_db.database_id,
							label: dst_db.label,
							database: dst_db.database,
							dialect: dst_db.dialect,
							host: dst_db.host,
							port: dst_db.port,
							username: dst_db.username,
							password: dst_db.password
								? passwordHandler.decryptSymmetric(dst_db.password)
								: null,
							driver: dst_db.driver,
							dsn: dst_db.dsn,
							schema: dst_db.schema,
							connection_uri: dst_db.connection_uri,
							options: JSON.parse(dst_db.options),
							type: dst_db.type,
						},
						configs: JSON.parse(dst_configs),
					},
					time_threshold: time_threshold,
				};
			};

			return row ? formatResult(row) : null;
		} catch (error) {
			throw error;
		}
	}

	async findForReload() {
		try {
			const rows = await JobModel.findAll({
				where: { is_active: true },
				attributes: ["job_id", "cron"],
				raw: true,
			});

			return rows;
		} catch (error) {
			throw error;
		}
	}

	async create(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			data.timestamp = timeHandler.nowEpoch();

			const row = await JobModel.create(data, { transaction: dbTrx });

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

			const { job_id, ...job } = data;

			const row = await JobModel.findByPk(job_id);

			if (!row) {
				throw Object.assign(new Error("Job not found."), {
					code: 404,
				});
			}

			await row.update(job, { transaction: dbTrx });

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

	async delete(jobId, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			let count = await JobModel.destroy({
				where: { job_id: jobId },
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

module.exports = { JobRepository: new JobRepository() };
