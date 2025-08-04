const Joi = require("joi");

const pipelineSchema = {
	filterPipeline(data) {
		const schema = Joi.object({
			pipeline_id: Joi.string().max(50).optional().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(200).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 200 characters.`,
			}),
			page: Joi.number().integer().min(1).optional().messages({
				"number.base": `'page' must be a number.`,
				"number.integer": `'page' must be an integer.`,
				"number.min": `'page' must be at least 1.`,
			}),
			limit: Joi.number().integer().min(1).max(1000).optional().messages({
				"number.base": `'limit' must be a number.`,
				"number.integer": `'limit' must be an integer.`,
				"number.min": `'limit' must be at least 1.`,
				"number.max": `'limit' must not exceed 1000.`,
			}),
		})
			.and("page", "limit")
			.messages({
				"object.and": `'page' and 'limit' must be provided together or not at all.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	createPipeline(data) {
		const schema = Joi.object({
			src_db_id: Joi.string().max(50).required().messages({
				"string.base": `'src_db_id' must be a string.`,
				"string.max": `'src_db_id' must not exceed 50 characters.`,
				"any.required": `'src_db_id' is required.`,
			}),
			dst_db_id: Joi.string().max(50).required().messages({
				"string.base": `'dst_db_id' must be a string.`,
				"string.max": `'dst_db_id' must not exceed 50 characters.`,
				"any.required": `'dst_db_id' is required.`,
			}),
			name: Joi.string().max(50).required().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 50 characters.`,
				"any.required": `'name' is required.`,
			}),
			description: Joi.string().allow(null, "").max(250).optional().messages({
				"string.base": `'description' must be a string, null or ''.`,
				"string.max": `'description' must not exceed 250 characters.`,
			}),
			pipelines: Joi.array()
				.items(
					Joi.object({
						name: Joi.string()
							.pattern(/^[^\s]+$/)
							.max(50)
							.required()
							.messages({
								"string.base": `'name' must be a string.`,
								"string.max": `'name' must not exceed 50 characters.`,
								"string.pattern.base": `'name' must not contain spaces.`,
								"any.required": `'name' is required.`,
							}),
						sql: Joi.string().max(1000).required().messages({
							"string.base": `'sql' must be a string.`,
							"string.max": `'sql' must not exceed 1000 characters.`,
							"any.required": `'sql' is required.`,
						}),
						type: Joi.string()
							.valid("extract", "transform", "load")
							.required()
							.messages({
								"string.base": `'type' must be a string.`,
								"any.only": `'type' must be one of 'extract', 'transform', 'load'.`,
								"any.required": `'type' is required.`,
							}),
						order: Joi.number().integer().min(1).optional().messages({
							"number.base": `'order' must be a number.`,
							"number.integer": `'order' must be an integer.`,
							"number.min": `'order' must be at least 1.`,
						}),
					})
				)
				.custom((value, helpers) => {
					const names = value.map((p) => p.name);
					const duplicates = names.filter(
						(name, idx) => names.indexOf(name) !== idx
					);
					if (duplicates.length > 0) {
						return helpers.error("array.duplicatePipelineName", {
							name: duplicates[0],
						});
					}
					return value;
				})
				.min(2)
				.required()
				.messages({
					"array.base": `'pipelines' must be an array.`,
					"array.min": `'pipelines' must contain at least 2 pipelines.`,
					"any.required": `'pipelines' is required.`,
					"array.duplicatePipelineName": `'pipelines' contains duplicate name '{{#name}}'. Each pipeline name must be unique.`,
				}),
		})
			.required()
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	updatePipeline(data) {
		const schema = Joi.object({
			pipeline_id: Joi.string().max(50).required().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
				"any.required": `'pipeline_id' is required.`,
			}),
			src_db_id: Joi.string().max(50).optional().messages({
				"string.base": `'src_db_id' must be a string.`,
				"string.max": `'src_db_id' must not exceed 50 characters.`,
			}),
			dst_db_id: Joi.string().max(50).optional().messages({
				"string.base": `'dst_db_id' must be a string.`,
				"string.max": `'dst_db_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(50).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 50 characters.`,
			}),
			description: Joi.string().allow(null, "").max(250).optional().messages({
				"string.base": `'description' must be a string, null or ''.`,
				"string.max": `'description' must not exceed 250 characters.`,
			}),
			pipelines: Joi.array()
				.items(
					Joi.object({
						name: Joi.string()
							.pattern(/^[^\s]+$/)
							.max(50)
							.required()
							.messages({
								"string.base": `'name' must be a string.`,
								"string.max": `'name' must not exceed 50 characters.`,
								"string.pattern.base": `'name' must not contain spaces.`,
								"any.required": `'name' is required.`,
							}),
						sql: Joi.string().max(1000).required().messages({
							"string.base": `'sql' must be a string.`,
							"string.max": `'sql' must not exceed 1000 characters.`,
							"any.required": `'sql' is required.`,
						}),
						type: Joi.string()
							.valid("extract", "transform", "load")
							.required()
							.messages({
								"string.base": `'type' must be a string.`,
								"any.only": `'type' must be one of 'extract', 'transform', 'load'.`,
								"any.required": `'type' is required.`,
							}),
						order: Joi.number().integer().min(1).optional().messages({
							"number.base": `'order' must be a number.`,
							"number.integer": `'order' must be an integer.`,
							"number.min": `'order' must be at least 1.`,
						}),
					})
				)
				.custom((value, helpers) => {
					const names = value.map((p) => p.name);
					const duplicates = names.filter(
						(name, idx) => names.indexOf(name) !== idx
					);
					if (duplicates.length > 0) {
						return helpers.error("array.duplicatePipelineName", {
							name: duplicates[0],
						});
					}
					return value;
				})
				.min(2)
				.optional()
				.messages({
					"array.base": `'pipelines' must be an array.`,
					"array.min": `'pipelines' must contain at least 2 pipelines.`,
				}),
		})
			.required()
			.or("name", "description", "source", "destination")
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
				"object.missing": `'pipeline_id' and at least one field to update must be provided.`,
				"array.duplicatePipelineName": `'pipelines' contains duplicate name '{{#name}}'. Each pipeline name must be unique.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	executePipeline(data) {
		const schema = Joi.object({
			action: Joi.string().valid("run", "preview").required().messages({
				"string.base": `'action' must be a string.`,
				"string.max": `'action' must not exceed 50 characters.`,
				"any.required": `'action' is required.`,
			}),
			pipeline_id: Joi.string().max(50).required().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
				"any.required": `'pipeline_id' is required.`,
			}),
		})
			.required()
			.messages({
				"object.base": `request query must be an object.`,
				"any.required": `request query is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { pipelineSchema };
