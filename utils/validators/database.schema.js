const Joi = require("joi");

const databaseSchema = {
	filterDatabase(data) {
		const schema = Joi.object({
			database_id: Joi.string().max(50).optional().messages({
				"string.base": `'database_id' must be a string.`,
				"string.max": `'database_id' must not exceed 50 characters.`,
			}),
			database: Joi.string().max(100).optional().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb")
				.optional()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb'.`,
				}),
			is_active: Joi.boolean().optional().messages({
				"string.base": `'is_active' must be a boolean.`,
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

	createDatabase(data) {
		const schema = Joi.object({
			database: Joi.string().max(100).required().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
				"any.required": `'database' is required.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb")
				.required()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb'.`,
					"any.required": `'dialect' is required.`,
				}),
			host: Joi.string().max(255).required().messages({
				"string.base": `'host' must be a string.`,
				"string.max": `'host' must not exceed 255 characters.`,
				"any.required": `'host' is required.`,
			}),
			port: Joi.number().integer().min(1).allow(null).optional().messages({
				"number.base": `'port' must be a number.`,
				"number.integer": `'port' must be an integer.`,
				"number.min": `'port' must be greater than 0.`,
				"any.required": `'port' is required.`,
			}),
			username: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'username' must be a string.`,
				"string.max": `'username' must not exceed 100 characters.`,
				"any.required": `'username' is required.`,
			}),
			password: Joi.string().allow(null).optional().messages({
				"string.base": `'password' must be a string.`,
				"any.required": `'password' is required.`,
			}),
			schema: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'schema' must be a string.`,
				"string.max": `'schema' must not exceed 100 characters.`,
			}),
			connection_uri: Joi.string().allow(null).optional().messages({
				"string.base": `'connection_uri' must be a string.`,
			}),
			options: Joi.object().allow(null).optional().messages({
				"object.base": `'options' must be a valid JSON object.`,
			}),
		}).messages({
			"object.base": `request body must be a valid JSON object.`,
			"any.required": `request body is required.`,
		});

		return schema.validate(data, { abortEarly: false });
	},

	updateDatabase(data) {
		const schema = Joi.object({
			database_id: Joi.string().max(50).required().messages({
				"string.base": `'database_id' must be a string.`,
				"string.max": `'database_id' must not exceed 50 characters.`,
				"any.required": `'database_id' is required.`,
			}),
			database: Joi.string().max(100).optional().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb")
				.optional()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb'.`,
				}),
			host: Joi.string().max(255).optional().messages({
				"string.base": `'host' must be a string.`,
				"string.max": `'host' must not exceed 255 characters.`,
			}),
			port: Joi.number().integer().min(1).allow(null).optional().messages({
				"number.base": `'port' must be a number.`,
				"number.integer": `'port' must be an integer.`,
				"number.min": `'port' must be greater than 0.`,
			}),
			username: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'username' must be a string.`,
				"string.max": `'username' must not exceed 100 characters.`,
			}),
			password: Joi.string().allow(null).optional().messages({
				"string.base": `'password' must be a string.`,
			}),
			schema: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'schema' must be a string.`,
				"string.max": `'schema' must not exceed 100 characters.`,
			}),
			connection_uri: Joi.string().allow(null).optional().messages({
				"string.base": `'connection_uri' must be a string.`,
			}),
			options: Joi.object().allow(null).optional().messages({
				"object.base": `'options' must be a valid JSON object.`,
			}),
			is_active: Joi.boolean().optional().messages({
				"string.base": `'is_active' must be a boolean.`,
			}),
		})
			.required()
			.or(
				"database",
				"dialect",
				"host",
				"port",
				"username",
				"password",
				"schema",
				"connection_uri",
				"options",
				"is_active"
			)
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'database_id' and at least one of the fields must be provided for update.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { databaseSchema };
