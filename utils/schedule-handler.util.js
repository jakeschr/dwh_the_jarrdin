const schedule = require("node-schedule");
const { JobRepository } = require("../repositories/job.repository.js");
const { LogRepository } = require("../repositories/log.repository.js");
const { runETL } = require("./pipeline/run-etl.js");
const { timeHandler } = require("./time-handler.util.js");

const scheduleHandler = {
	createTask(job_id, cron) {
		try {
			if (schedule.scheduledJobs[job_id]) {
				scheduleHandler.cancelTask(job_id);
			}

			schedule.scheduleJob(job_id, cron, async () => {
				let logDetails = null;
				let jobExecuted = false;

				try {
					const dataJob = await JobRepository.findForETL(job_id);

					if (!dataJob || !dataJob.is_active) {
						scheduleHandler.cancelTask(job_id);
						return;
					}

					const resultETL = await runETL(dataJob);

					logDetails = resultETL.log;
					jobExecuted = true;
				} catch (err) {
					logDetails = err;
					jobExecuted = true;
				} finally {
					if (jobExecuted) {
						await JobRepository.update({
							job_id: job_id,
							time_threshold: timeHandler.nowEpoch(),
						});

						await LogRepository.create({
							actor_id: job_id,
							details: logDetails,
							action: "execute",
						});
					}
				}
			});

			return true;
		} catch (error) {
			throw error;
		}
	},

	cancelTask(job_id) {
		try {
			if (schedule.scheduledJobs[job_id]) {
				const job = schedule.scheduledJobs[job_id];

				job.cancel();
			}

			return true;
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
};

module.exports = { scheduleHandler };
