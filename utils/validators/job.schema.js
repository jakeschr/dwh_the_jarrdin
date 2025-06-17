const Joi = require("joi");
const { timeHandler } = require("../time-handler.util");

const jobSchema = {
	filterJob(data) {
		const schema = Joi.object({
			job_id: Joi.string().max(50).messages({
				"string.base": `'job_id' must be a string.`,
				"string.max": `'job_id' must not exceed 50 characters.`,
			}),
			pipeline_id: Joi.string().max(50).optional().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			status: Joi.string().valid("active", "inactive").optional().messages({
				"string.base": `'status' must be a string.`,
				"any.only": `'status' must be either 'active' or 'inactive'.`,
			}),
			page: Joi.number().integer().min(1).optional().messages({
				"number.base": `'page' must be a number.`,
				"number.integer": `'page' must be an integer.`,
				"number.min": `'page' number must be at least 1.`,
			}),
			limit: Joi.number().integer().min(1).max(100).optional().messages({
				"number.base": `'limit' must be a number.`,
				"number.integer": `'limit' must be an integer.`,
				"number.min": `'limit' must be at least 1.`,
				"number.max": `'limit' must not exceed 100.`,
			}),
		})
			.and("page", "limit")
			.messages({
				"object.and": `'page' and 'limit' must be provided together or not at all.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	createJob(data) {
		const schema = Joi.object({
			pipeline_id: Joi.string().max(50).required().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
				"any.required": `'pipeline_id' is required.`,
			}),
			name: Joi.string().max(100).required().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
				"any.required": `'name' is required.`,
			}),
			description: Joi.string().allow(null, "").max(1000).required().messages({
				"string.base": `'description' must be a string.`,
				"string.max": `'description' must not exceed 1000 characters.`,
				"any.required": `'description' is required.`,
			}),
			cron: Joi.string().max(50).required().messages({
				"string.base": `'cron' must be a string.`,
				"string.max": `'cron' must not exceed 50 characters.`,
				"any.required": `'cron' is required.`,
			}),
			time_threshold: Joi.string()
				.required()
				.custom((value, helpers) => {
					try {
						timeHandler.stringToEpoch(value, "DD/MM/YYYY HH:mm:ss");
						return value;
					} catch (err) {
						return helpers.error("any.invalid", {
							message: err.message,
						});
					}
				})
				.messages({
					"string.base": `'time_threshold' must be a string in format 'DD/MM/YYYY HH:mm:ss'.`,
					"any.required": `'time_threshold' is required.`,
					"any.invalid": `'time_threshold' must be in format 'DD/MM/YYYY HH:mm:ss'.`,
				}),
		}).messages({
			"object.base": `request body must be a valid JSON object.`,
			"any.required": `request body is required.`,
		});

		return schema.validate(data, { abortEarly: false });
	},

	updateJob(data) {
		const schema = Joi.object({
			job_id: Joi.string().max(50).required().messages({
				"string.base": `'job_id' must be a string.`,
				"string.max": `'job_id' must not exceed 50 characters.`,
				"any.required": `'job_id' is required for updates.`,
			}),
			pipeline_id: Joi.string().max(50).optional().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			description: Joi.string().allow(null, "").max(1000).optional().messages({
				"string.base": `'description' must be a string.`,
				"string.max": `'description' must not exceed 1000 characters.`,
			}),
			cron: Joi.string().max(50).optional().messages({
				"string.base": `'cron' must be a string.`,
				"string.max": `'cron' must not exceed 50 characters.`,
			}),
			time_threshold: Joi.string()
				.optional()
				.custom((value, helpers) => {
					try {
						timeHandler.stringToEpoch(value, "DD/MM/YYYY HH:mm:ss");
						return value;
					} catch (err) {
						return helpers.error("any.invalid", {
							message: err.message,
						});
					}
				})
				.messages({
					"string.base": `'time_threshold' must be a string in format 'DD/MM/YYYY HH:mm:ss'.`,
					"any.invalid": `'time_threshold' must be in format 'DD/MM/YYYY HH:mm:ss'.`,
				}),
			status: Joi.string().valid("active", "inactive").optional().messages({
				"string.base": `'status' must be a string.`,
				"any.only": `'status' must be either 'active' or 'inactive'.`,
			}),
		})
			.required()
			.or(
				"pipeline_id",
				"name",
				"description",
				"cron",
				"time_threshold",
				"status"
			)
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'job_id' and at least one of this fields ['pipeline_id', 'name', 'description', 'cron', 'time_threshold', 'status'] must be provided for updates.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { jobSchema };
