const Joi = require("joi");

const logSchema = {
	filterLog(data) {
		const schema = Joi.object({
			log_id: Joi.string().max(50).optional().messages({
				"string.base": `'log_id' must be a string.`,
				"string.max": `'log_id' must not exceed 50 characters.`,
			}),
			user_id: Joi.string().allow(null, "").max(50).optional().messages({
				"string.base": `'user_id' must be a string, null or ''.`,
				"string.max": `'user_id' must not exceed 50 characters.`,
			}),
			job_id: Joi.string().allow(null, "").max(50).optional().messages({
				"string.base": `'job_id' must be a string, null or ''.`,
				"string.max": `'job_id' must not exceed 50 characters.`,
			}),
			action: Joi.string()
				.valid("create", "update", "delete", "execute")
				.optional()
				.messages({
					"string.base": `'action' must be a string.`,
					"any.only": `'action' must be either 'create', 'update', 'delete' or 'execute'.`,
				}),
			type: Joi.string().valid("user", "job").optional().messages({
				"string.base": `'type' must be a string.`,
				"any.only": `'type' must be either 'user' or 'job'.`,
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

	deleteLog(data) {
		const schema = Joi.object({
			log_id: Joi.string().max(50).optional().messages({
				"string.base": `'log_id' must be a string.`,
				"string.max": `'log_id' must not exceed 50 characters.`,
			}),
			user_id: Joi.string().allow(null, "").max(50).optional().messages({
				"string.base": `'user_id' must be a string, null or ''.`,
				"string.max": `'user_id' must not exceed 50 characters.`,
			}),
			job_id: Joi.string().allow(null, "").max(50).optional().messages({
				"string.base": `'job_id' must be a string, null or ''.`,
				"string.max": `'job_id' must not exceed 50 characters.`,
			}),
		})
			.xor("log_id", "user_id", "job_id")
			.messages({
				"object.missing": `One of 'log_id', 'user_id', or 'job_id' must be provided for deletion.`,
				"object.xor": `Only one of 'log_id', 'user_id', or 'job_id' can be provided for deletion.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { logSchema };
