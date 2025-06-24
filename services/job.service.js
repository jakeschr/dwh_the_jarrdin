const { JobRepository } = require("../repositories/job.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");
const { Connection } = require("../models/index.js");

const { scheduleHandler } = require("../utils/schedule-handler.util.js");
const { filterHandler } = require("../utils/filter-handler.util.js");
const { timeHandler } = require("../utils/time-handler.util.js");

class JobService {
	async find(data, response_type) {
		try {
			let result = {};
			switch (response_type) {
				case "summary":
					const { page, limit, ...others } = data;
					const filters = filterHandler([], others);
					const pagination = page && limit ? { page, limit } : undefined;

					result = await JobRepository.findMany(filters, pagination);
					break;
				case "detail":
					result = await JobRepository.findOne(data.id);
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

			data.time_threshold = timeHandler.stringToEpoch(data.time_threshold);
			const createdRow = await JobRepository.create(data, dbTrx);

			scheduleHandler.createTask(createdRow.job_id, createdRow.cron);

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: createdRow.dataValues,
					action: "create",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await JobRepository.findOne(createdRow.job_id);

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

			if (data.time_threshold) {
				data.time_threshold = timeHandler.stringToEpoch(data.time_threshold);
			}

			const oldSchedule = await JobRepository.findOne(data.job_id);
			const newSchedule = await JobRepository.update(data, dbTrx);

			if (oldSchedule.status === "active") {
				if (
					newSchedule.status === "active" &&
					oldSchedule.cron !== newSchedule.cron
				) {
					scheduleHandler.cancelTask(oldSchedule.job_id);
					scheduleHandler.createTask(newSchedule.job_id, newSchedule.cron);
				}

				if (newSchedule.status === "inactive") {
					scheduleHandler.cancelTask(oldSchedule.job_id);
				}
			} else {
				if (newSchedule.status === "active") {
					scheduleHandler.createTask(newSchedule.job_id, newSchedule.cron);
				}
			}

			await LogRepository.create(
				{
					actor_id: session.user_id,
					details: updatedRow.dataValues,
					action: "update",
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await JobRepository.findOne(newSchedule.job_id);

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

			const deletedCount = await JobRepository.delete(data.id, dbTrx);
			scheduleHandler.cancelTask(data.id);

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

	async reload() {
		try {
			const jobs = await JobRepository.findForReload();

			jobs.forEach((job) => {
				scheduleHandler.createTask(job.job_id, job.cron);
			});

			return true;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
}

module.exports = { JobService: new JobService() };
