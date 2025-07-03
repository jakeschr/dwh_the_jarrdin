const Joi = require("joi");

const databaseSchema = {
	filterDatabase(data) {
		const schema = Joi.object({
			database_id: Joi.string().max(50).optional().messages({
				"string.base": `'database_id' must be a string.`,
				"string.max": `'database_id' must not exceed 50 characters.`,
			}),
			label: Joi.string().max(100).optional().messages({
				"string.base": `'label' must be a string.`,
				"string.max": `'label' must not exceed 100 characters.`,
			}),
			database: Joi.string().max(100).optional().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb", "sqlserver", "sybase", "oracle")
				.optional()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb', 'sqlserver', 'sybase', or 'oracle'.`,
				}),
			driver: Joi.string().valid("native", "odbc").optional().messages({
				"string.base": `'driver' must be a string.`,
				"any.only": `'driver' must be either 'native' or 'odbc'.`,
			}),
			is_active: Joi.boolean().optional().messages({
				"boolean.base": `'is_active' must be a boolean.`,
			}),
			type: Joi.string()
				.valid("operational", "lake", "warehouse")
				.optional()
				.messages({
					"string.base": `'type' must be a string.`,
					"any.only": `'type' must be one of 'operational', 'lake' or 'warehouse'.`,
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
			label: Joi.string().max(100).required().messages({
				"string.base": `'label' must be a string.`,
				"string.max": `'label' must not exceed 100 characters.`,
				"any.required": `'label' is required.`,
			}),
			database: Joi.string().max(100).required().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
				"any.required": `'database' is required.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb", "sqlserver", "sybase", "oracle")
				.required()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb', 'sqlserver', 'sybase', or 'oracle'.`,
					"any.required": `'dialect' is required.`,
				}),
			driver: Joi.string().valid("native", "odbc").required().messages({
				"string.base": `'driver' must be a string.`,
				"any.only": `'driver' must be either 'native' or 'odbc'.`,
				"any.required": `'driver' is required.`,
			}),
			dsn: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'dsn' must be a string.`,
				"string.max": `'dsn' must not exceed 100 characters.`,
			}),
			host: Joi.string().max(255).allow(null).optional().messages({
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
			type: Joi.string()
				.valid("operational", "lake", "warehouse")
				.required()
				.messages({
					"string.base": `'type' must be a string.`,
					"any.only": `'type' must be one of 'operational', 'lake', 'warehouse'.`,
					"any.required": `'type' is required.`,
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
			label: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'label' must be a string.`,
				"string.max": `'label' must not exceed 100 characters.`,
			}),
			database: Joi.string().max(100).optional().messages({
				"string.base": `'database' must be a string.`,
				"string.max": `'database' must not exceed 100 characters.`,
			}),
			dialect: Joi.string()
				.valid("mysql", "postgres", "mongodb", "sqlserver", "sybase", "oracle")
				.optional()
				.messages({
					"string.base": `'dialect' must be a string.`,
					"any.only": `'dialect' must be one of 'mysql', 'postgres', 'mongodb', 'sqlserver', 'sybase', or 'oracle'.`,
				}),
			driver: Joi.string().valid("native", "odbc").optional().messages({
				"string.base": `'driver' must be a string.`,
				"any.only": `'driver' must be either 'native' or 'odbc'.`,
			}),
			dsn: Joi.string().max(100).allow(null).optional().messages({
				"string.base": `'dsn' must be a string.`,
				"string.max": `'dsn' must not exceed 100 characters.`,
			}),
			host: Joi.string().max(255).allow(null).optional().messages({
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
				"boolean.base": `'is_active' must be a boolean.`,
			}),
			type: Joi.string()
				.valid("operational", "lake", "warehouse")
				.optional()
				.messages({
					"string.base": `'type' must be a string.`,
					"any.only": `'type' must be one of 'operational', 'lake' or 'warehouse'.`,
				}),
		})
			.required()
			.or(
				"label",
				"database",
				"dialect",
				"driver",
				"dsn",
				"host",
				"port",
				"username",
				"password",
				"schema",
				"connection_uri",
				"options",
				"is_active",
				"type"
			)
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'database_id' and at least one field to update must be provided.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	createTable(data) {
		const schema = Joi.object({
			database_id: Joi.string().required().messages({
				"string.base": `'database_id' must be a string.`,
				"any.required": `'database_id' is required.`,
			}),
			tables: Joi.array()
				.items(
					Joi.object({
						name: Joi.string().max(100).required().messages({
							"string.base": `'name' of table must be a string.`,
							"string.max": `'name' must not exceed 100 characters.`,
							"any.required": `'name' is required.`,
						}),
						pk: Joi.array().items(Joi.string()).required().messages({
							"array.base": `'pk' must be an array of strings.`,
							"any.required": `'pk' is required.`,
						}),
						columns: Joi.array()
							.items(
								Joi.object({
									name: Joi.string().max(100).required().messages({
										"string.base": `'column.name' must be a string.`,
										"string.max": `'column.name' must not exceed 100 characters.`,
										"any.required": `'column.name' is required.`,
									}),
									type: Joi.string().max(100).required().messages({
										"string.base": `'column.type' must be a string.`,
										"string.max": `'column.type' must not exceed 100 characters.`,
										"any.required": `'column.type' is required.`,
									}),
									null: Joi.boolean().required().messages({
										"boolean.base": `'column.null' must be a boolean.`,
										"any.required": `'column.null' is required.`,
									}),
								})
							)
							.min(2)
							.required()
							.messages({
								"array.base": `'columns' must be an array.`,
								"array.min": `'columns' must contain at least 2 item.`,
								"any.required": `'columns' is required.`,
							}),
					})
				)
				.min(1)
				.required()
				.messages({
					"array.base": `'tables' must be an array.`,
					"array.min": `'tables' must contain at least 1 table.`,
					"any.required": `'tables' is required.`,
				}),
		});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { databaseSchema };
