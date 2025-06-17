const Joi = require("joi");

const apiSchema = {
	filterApi(data) {
		const schema = Joi.object({
			api_id: Joi.string().max(50).messages({
				"string.base": `'api_id' must be a string.`,
				"string.max": `'api_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			auth_type: Joi.string()
				.valid("bearer", "api_key", "basic")
				.optional()
				.messages({
					"string.base": `'auth_type' must be a string.`,
					"any.only": `'auth_type' must be one of 'bearer', 'api_key', 'basic'.`,
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

	createApi(data) {
		const schema = Joi.object({
			name: Joi.string().max(100).required().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
				"any.required": `'name' is required.`,
			}),
			description: Joi.string().required().messages({
				"string.base": `'description' must be a string.`,
				"any.required": `'description' is required.`,
			}),
			base_url: Joi.string().max(200).required().messages({
				"string.base": `'base_url' must be a string.`,
				"string.max": `'base_url' must not exceed 200 characters.`,
				"any.required": `'base_url' is required.`,
			}),
			headers: Joi.object().required().messages({
				"object.base": `'headers' must be a valid JSON object.`,
				"any.required": `'headers' are required.`,
			}),
			auth_key: Joi.string().max(200).required().messages({
				"string.base": `'auth_key' must be a string.`,
				"string.max": `'auth_key' must not exceed 200 characters.`,
				"any.required": `'auth_key' is required.`,
			}),
			auth_url: Joi.string().allow(null).max(200).required().messages({
				"string.base": `'auth_url' must be a string.`,
				"string.max": `'auth_url' must not exceed 200 characters.`,
				"any.required": `'auth_url' is required.`,
			}),
			auth_type: Joi.string()
				.valid("bearer", "api_key", "basic", "oauth2")
				.default("bearer")
				.required()
				.messages({
					"string.base": `'auth_type' must be a string.`,
					"any.required": `'auth_type' is required.`,
					"any.only": `'auth_type' must be one of 'bearer', 'api_key', 'basic', 'oauth2'.`,
				}),
		}).messages({
			"object.base": `request body must be a valid JSON object.`,
			"any.required": `request body is required.`,
		});

		return schema.validate(data, { abortEarly: false });
	},

	updateApi(data) {
		const schema = Joi.object({
			api_id: Joi.string().max(50).required().messages({
				"string.base": `'api_id' must be a string.`,
				"string.max": `'api_id' must not exceed 50 characters.`,
				"any.required": `'api_id' is required.`,
			}),
			name: Joi.string().max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			description: Joi.string().allow(null, "").optional().messages({
				"string.base": `'description' must be a string.`,
			}),
			base_url: Joi.string().max(200).optional().messages({
				"string.base": `'base_url' must be a string.`,
				"string.max": `'base_url' must not exceed 200 characters.`,
			}),
			headers: Joi.object().optional().messages({
				"object.base": `'headers' must be a valid JSON object.`,
			}),
			auth_key: Joi.string().max(200).optional().messages({
				"string.base": `'auth_key' must be a string.`,
				"string.max": `'auth_key' must not exceed 200 characters.`,
			}),
			auth_url: Joi.string().allow(null).max(200).optional().messages({
				"string.base": `'auth_url' must be a string.`,
				"string.max": `'auth_url' must not exceed 200 characters.`,
			}),
			auth_type: Joi.string()
				.valid("bearer", "api_key", "basic", "oauth2")
				.optional()
				.messages({
					"string.base": `'auth_type' must be a string.`,
					"any.only": `'auth_type' must be one of 'bearer', 'api_key', 'basic', 'oauth2'.`,
				}),
			status: Joi.string().valid("active", "inactive").optional().messages({
				"string.base": `'status' must be a string.`,
				"any.only": `'status' must be either 'active' or 'inactive'.`,
			}),
		})
			.required()
			.or(
				"name",
				"description",
				"base_url",
				"headers",
				"auth_key",
				"auth_url",
				"auth_type",
				"status"
			)
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'api_id' and at least one of this fields ['name', 'description', 'base_url', 'headers', 'auth_key', 'auth_url', 'auth_type', 'status'] must be provided for updates.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { apiSchema };
