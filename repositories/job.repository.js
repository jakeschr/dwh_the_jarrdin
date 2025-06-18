const {
	Connection,
	Sequelize,
	Op,
	JobModel,
	PipelineModel,
	PipelineApiModel,
	ApiModel,
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
				attributes: ["job_id", "name", "cron", "time_threshold", "status"],
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
					status: job.status,
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
					status: job.status,
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
								model: PipelineApiModel,
								required: true,
								attributes: ["configs", "type"],
								include: [
									{
										model: ApiModel,
										required: true,
									},
								],
							},
						],
					},
				],
			});

			const formatResult = (job) => {
				const pipeline = job.pipeline;
				const grouped = { src: [], dst: [] };

				for (const item of pipeline.pipeline_apis) {
					const formatted = {
						api: {
							api_id: item.api.api_id,
							name: item.api.name,
							base_url: item.api.base_url,
							headers: JSON.parse(item.api.headers),
							auth_key: item.api.auth_key,
							auth_url: item.api.auth_url,
							auth_type: item.api.auth_type,
							api_type: item.api.api_type,
						},
						configs: JSON.parse(item.configs),
					};

					if (grouped[item.type]) {
						grouped[item.type].push(formatted);
					}
				}
				return {
					job_id: job.job_id,
					status: job.status,
					is_preview: false,
					time_threshold: job.time_threshold,
					sources: grouped.src,
					destinations: grouped.dst,
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
				where: { status: "active" },
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
