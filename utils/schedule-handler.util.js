const schedule = require("node-schedule");
const { JobRepository } = require("../repositories/job.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");
const { pipeline } = require("./pipeline/pipeline.js");
const { timeHandler } = require("./time-handler.util.js");

const scheduleHandler = {
	createTask(job_id, cron) {
		try {
			if (schedule.scheduledJobs[job_id]) {
				console.error(`SCHEDULER ERROR: job[${job_id}] already exists.`);
				throw Object.assign(new Error(`job[${job_id}] already exists`), {
					code: 409,
				});
			}

			schedule.scheduleJob(job_id, cron, async () => {
				try {
					const startingTime = timeHandler.nowEpoch();

					const dataJob = await JobRepository.findForETL(job_id);

					if (!dataJob || dataJob.status !== "active") {
						scheduleHandler.cancelTask(job_id);
						return;
					}

					let etlResult;
					try {
						etlResult = await pipeline(dataJob);
					} catch (etlError) {
						console.error(`SCHEDULER ERROR: job[${job_id}]:`, error);

						const finishingTime = timeHandler.nowEpoch();
						// Tetap buat log walaupun etl gagal total
						await LogRepository.create({
							job_id: dataJob.job_id,
							message: etlError?.message,
							details: {
								start_time: startingTime,
								end_time: finishingTime,
								extract_log: null,
								transform_log: null,
								load_log: null,
							},
							action: "execute",
							type: "job",
						});
						return;
					}

					// Buat log berdasarkan hasil etl
					await LogRepository.create({
						job_id: dataJob.job_id,
						message: etlResult.log.message,
						details: {
							start_time: etlResult.log.start_time,
							end_time: etlResult.log.end_time,
							extract_log: etlResult.log.extract_log,
							transform_log: etlResult.log.transform_log,
							load_log: etlResult.log.load_log,
						},
						action: "execute",
						type: "job",
					});

					// Update time_threshold hanya jika status bukan error
					await JobRepository.update({
						job_id: dataJob.job_id,
						time_threshold: etlResult.log.start_time,
					});

					console.error(
						`SCHEDULER LOG: Job[${job_id}] executed siccessfully [${timeHandler.nowString()}]`
					);
				} catch (error) {
					console.error(`SCHEDULER ERROR: job[${job_id}]:`, error.message);
				}
			});

			return true;
		} catch (error) {
			console.error(error);
			throw error;
		}
	},

	cancelTask(job_id) {
		try {
			if (schedule.scheduledJobs[job_id]) {
				const job = schedule.scheduledJobs[job_id];

				job.cancel();

				console.error(`SCHEDULER LOG: job[${job_id}] cancel successfully.`);
			} else {
				console.error(`SCHEDULER ERROR: job[${job_id}] not found.`);
			}

			return true;
		} catch (error) {
			console.error(error);
			throw error;
		}
	},

	async reloadTask() {
		try {
			const jobs = await JobRepository.findForReload();

			jobs.forEach((job) => {
				scheduleHandler.createTask(job.job_id, job.cron);
			});

			console.error(`SCHEDULER LOG: Job reloaded successfully.`);

			return true;
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
};

module.exports = { scheduleHandler };
