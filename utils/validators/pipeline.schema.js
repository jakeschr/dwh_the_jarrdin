const Joi = require("joi");

const filterObj = {
	columns: Joi.array()
		.items(
			Joi.string().max(50).messages({
				"string.base": `'columns' must contain strings.`,
				"string.max": `Each item in 'columns' must not exceed 50 characters.`,
			})
		)
		.min(1)
		.required()
		.messages({
			"array.base": `'columns' must be an array.`,
			"array.min": `'columns' must contain at least one item.`,
			"any.required": `'columns' is a required in filters item.`,
		}),
	operator: Joi.string()
		.valid(
			"is",
			"in",
			"eq",
			"ne",
			"gt",
			"lt",
			"gte",
			"lte",
			"like",
			"between",
			"not",
			"not_in",
			"not_like",
			"not_between"
		)
		.required()
		.messages({
			"string.base": `'operator' must be a string.`,
			"any.only": `'operator' must be either 'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'not_like', 'in', 'not_in', 'is', 'not', 'between', 'not_between'.`,
			"any.required": `'operator' is required.`,
		}),
	value: Joi.alternatives().conditional("operator", {
		switch: [
			{
				is: Joi.valid("in", "not_in"),
				then: Joi.array().min(1).required().messages({
					"array.base": `'value' must be an array when operator is 'in' or 'not_in'.`,
					"array.min": `'value' must contain at least one item.`,
					"any.required": `'value' is required.`,
				}),
			},
			{
				is: Joi.valid("between", "not_between"),
				then: Joi.array().length(2).required().messages({
					"array.length": `'value' must contain exactly two items when operator is 'between' or 'not_between'.`,
					"any.required": `'value' is required.`,
				}),
			},
			{
				is: Joi.valid("is", "not"),
				then: Joi.valid(null, true, false).required().messages({
					"any.only": `'value' must be null, true, or false when operator is 'is' or 'not'.`,
					"any.required": `'value' is required.`,
				}),
			},
		],
		otherwise: Joi.alternatives([
			Joi.string(),
			Joi.number(),
			Joi.boolean(),
			Joi.object({
				source: Joi.valid("time_threshold").required().messages({
					"string.base": `'value.source' must be a string in dynamic filter.`,
					"any.only": `'value.source' must be 'time_threshold' in dynamic filter.`,
					"any.required": `'value.source' is required in dynamic filter.`,
				}),
				default: Joi.alternatives([Joi.string(), Joi.number()])
					.required()
					.messages({
						"any.required": `'value.default' is required in dynamic filter.`,
					}),
			}),
		])
			.required()
			.messages({
				"any.required": `'value' is required.`,
				"alternatives.types": `'value' must be a string, number, boolean, or date.`,
			}),
	}),
};

const transformObj = {
	type: Joi.string()
		.valid(
			"join",
			"rename",
			"formula",
			"map",
			"filter",
			"aggregate",
			"time-format"
		)
		.required()
		.messages({
			"string.base": `'type' must be a text.`,
			"any.required": `'type' is required.`,
			"any.only": `'type' must be one of 'join', 'rename', 'formula', 'map', 'filter', 'aggregate', 'time-format'.`,
		}),
	order: Joi.number().integer().min(1).required().messages({
		"number.base": `'order' in transforms item must be a number.`,
		"number.integer": `'order' in transforms item must be an integer.`,
		"number.min": `'order' in transforms item must be at least 1.`,
		"any.required": `'order' in transforms item is required.`,
	}),

	// CASE: join
	left: Joi.when("type", {
		is: "join",
		then: Joi.string()
			.pattern(/^[a-z]+\.[a-z_]+\.[a-z_]+$/)
			.required()
			.messages({
				"string.pattern.base": `'left' must be in format scope.table.column (e.g. trf.invoice.invoice_id).`,
				"any.required": `'left' is required when type is 'join'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	right: Joi.when("type", {
		is: "join",
		then: Joi.string()
			.pattern(/^[a-z]+\.[a-z_]+\.[a-z_]+$/)
			.required()
			.messages({
				"string.pattern.base": `'right' must be in format scope.table.column (e.g. ext.payment.invoice_id).`,
				"any.required": `'right' is required when type is 'join'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	join_type: Joi.when("type", {
		is: "join",
		then: Joi.string()
			.valid("inner", "outer", "right", "left")
			.required()
			.messages({
				"any.only": `'join_type' must be one of 'inner', 'outer', 'right', or 'left'.`,
				"any.required": `'join_type' is required when type is 'join'.`,
			}),
		otherwise: Joi.forbidden(),
	}),

	// CASE: rename
	rename_from: Joi.when("type", {
		is: "rename",
		then: Joi.string().required().messages({
			"any.required": `'rename_from' is required when type is 'rename'.`,
		}),
		otherwise: Joi.forbidden(),
	}),
	rename_to: Joi.when("type", {
		is: "rename",
		then: Joi.string().required().messages({
			"any.required": `'rename_to' is required when type is 'rename'.`,
		}),
		otherwise: Joi.forbidden(),
	}),

	// CASE: formula
	expression: Joi.when("type", {
		is: "formula",
		then: Joi.string().required().messages({
			"any.required": `'expression' is required when type is 'formula'.`,
		}),
		otherwise: Joi.forbidden(),
	}),
	as: Joi.when("type", {
		is: Joi.valid("formula", "aggregate"),
		then: Joi.string().required().messages({
			"any.required": `'as' is required when type is 'formula' or 'aggregate'.`,
		}),
		otherwise: Joi.forbidden(),
	}),

	// CASE: map
	field: Joi.when("type", {
		is: "map",
		then: Joi.string().required().messages({
			"any.required": `'field' is required when type is 'map'.`,
		}),
		otherwise: Joi.when("type", {
			is: "filter",
			then: Joi.forbidden(), // handled below
			otherwise: Joi.forbidden(),
		}),
	}),
	mapping: Joi.when("type", {
		is: "map",
		then: Joi.object().min(1).required().messages({
			"object.base": `'mapping' must be an object.`,
			"any.required": `'mapping' is required when type is 'map'.`,
		}),
		otherwise: Joi.forbidden(),
	}),

	// CASE: filter or time-format
	columns: Joi.when("type", {
		is: ["filter", "time-format"],
		then: Joi.array()
			.items(
				Joi.string().min(3).max(100).required().messages({
					"string.base": `columns items must be a string.`,
					"string.min": `columns items min characters is 3.`,
					"string.max": `columns items max characters is 100.`,
					"any.required": `columns items is required.`,
				})
			)
			.min(1)
			.required()
			.messages({
				"array.base": `'columns' must be an array.`,
				"array.min": `'columns' must contain at least one item.`,
				"any.required": `'columns' is required when type is 'filter' or 'time-format'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	operator: Joi.when("type", {
		is: "filter",
		then: Joi.string()
			.valid(
				"eq",
				"ne",
				"gt",
				"gte",
				"lt",
				"lte",
				"like",
				"not_like",
				"in",
				"not_in",
				"is",
				"not",
				"between",
				"not_between"
			)
			.required()
			.messages({
				"any.only": `'operator' must be a valid comparison operator.`,
				"any.required": `'operator' is required when type is 'filter'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	value: Joi.when("type", {
		is: "filter",
		then: Joi.alternatives()
			.try(Joi.string(), Joi.number(), Joi.boolean(), Joi.date(), Joi.array())
			.required()
			.messages({
				"any.required": `'value' is required when type is 'filter'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	old_format: Joi.when("type", {
		is: "time-format",
		then: Joi.string()
			.valid(
				"YYYY-MM-DDTHH:mm:ssZ",
				"YYYY-MM-DD HH:mm:ss",
				"DD/MM/YYYY HH:mm:ss",
				"YYYY-MM-DD",
				"DD/MM/YYYY",
				"epoch_ms",
				"epoch_s"
			)
			.required()
			.messages({
				"any.only": `'old_format' must be a valid.`,
				"any.required": `'old_format' is required when type is 'time-format'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	new_format: Joi.when("type", {
		is: "time-format",
		then: Joi.string()
			.valid(
				"YYYY-MM-DDTHH:mm:ssZ",
				"YYYY-MM-DD HH:mm:ss",
				"DD/MM/YYYY HH:mm:ss",
				"YYYY-MM-DD",
				"DD/MM/YYYY",
				"epoch_ms",
				"epoch_s"
			)
			.required()
			.messages({
				"any.only": `'new_format' must be a valid.`,
				"any.required": `'new_format' is required when type is 'time-format'.`,
			}),
		otherwise: Joi.forbidden(),
	}),

	// CASE: aggregate
	operation: Joi.when("type", {
		is: "aggregate",
		then: Joi.string()
			.valid("sum", "count", "avg", "max", "min")
			.required()
			.messages({
				"any.only": `'operation' must be one of 'sum', 'count', 'avg', 'max', or 'min'.`,
				"any.required": `'operation' is required when type is 'aggregate'.`,
			}),
		otherwise: Joi.forbidden(),
	}),
	table: Joi.when("type", {
		is: "aggregate",
		then: Joi.string().required().messages({
			"any.required": `'table' is required when type is 'aggregate'.`,
		}),
		otherwise: Joi.forbidden(),
	}),
	group_by: Joi.when("type", {
		is: "aggregate",
		then: Joi.string().required().messages({
			"any.required": `'group_by' is required when type is 'aggregate'.`,
		}),
		otherwise: Joi.forbidden(),
	}),
};

const srcObj = {
	database_id: Joi.string().max(50).required().messages({
		"string.base": `source 'database_id' must be a string.`,
		"string.max": `source 'database_id' must not exceed 50 characters.`,
		"any.required": `source 'database_id' is required.`,
	}),
	configs: Joi.array()
		.items(
			Joi.object({
				table: Joi.string().max(50).required().messages({
					"string.base": `'table' must be a string.`,
					"string.max": `'table' must not exceed 50 characters.`,
					"any.required": `'table' is a required in source item.`,
				}),
				columns: Joi.array()
					.items(
						Joi.string().max(50).messages({
							"string.base": `'columns' must contain strings.`,
							"string.max": `each item in 'columns' must not exceed 50 characters.`,
						})
					)
					.min(1)
					.required()
					.messages({
						"array.base": `'columns' must be an array.`,
						"array.min": `'columns' must contain at least one item.`,
						"any.required": `'columns' is a required in source item.`,
					}),
				filters: Joi.array()
					.items(
						Joi.object(filterObj).messages({
							"object.base": `'filters' items must be an object.`,
						})
					)
					.min(1)
					.allow(null)
					.optional()
					.messages({
						"array.base": `'filters' must be an array.`,
						"array.min": `'filters' must contain at least one item.`,
					}),
			}).messages({
				"object.base": `source 'configs' items must be an object.`,
			})
		)
		.min(1)
		.required()
		.messages({
			"array.base": `source 'configs' must be an array.`,
			"array.min": `source 'configs' must contain at least one item.`,
			"any.required": `source 'configs' is a required.`,
		}),
};

const dstObj = {
	database_id: Joi.string().max(50).required().messages({
		"string.base": `destination 'database_id' must be a string.`,
		"string.max": `destination 'database_id' must not exceed 50 characters.`,
		"any.required": `destination 'database_id' is required.`,
	}),
	configs: Joi.array()
		.items(
			Joi.object({
				table: Joi.string().max(50).required().messages({
					"string.base": `'table' in destination item must be a string.`,
					"string.max": `'table' in destination item must not exceed 50 characters.`,
					"any.required": `'table' is a required in destination item.`,
				}),
				columns: Joi.array()
					.items(
						Joi.string().max(50).messages({
							"string.base": `'columns' must contain strings.`,
							"string.max": `Each item in 'columns' must not exceed 50 characters.`,
						})
					)
					.min(1)
					.required()
					.messages({
						"array.base": `'columns' must be an array.`,
						"array.min": `'columns' must contain at least one item.`,
						"any.required": `'columns' is a required in destination item.`,
					}),
				unique: Joi.array()
					.items(
						Joi.string().max(50).messages({
							"string.base": `'unique' must contain strings.`,
							"string.max": `Each item in 'unique' must not exceed 50 characters.`,
						})
					)
					.min(1)
					.optional()
					.messages({
						"array.base": `'unique' must be an array.`,
						"array.min": `'unique' must contain at least one item.`,
						"any.required": `'unique' is a required in destination item.`,
					}),
				init_value: Joi.string()
					.pattern(/^[a-z]+\.[a-z_]+$/)
					.required()
					.messages({
						"string.pattern.base": `'init_value' must be in format scope.table (e.g. src.invoice).`,
						"any.required": `'init_value' is required.`,
					}),
				order: Joi.number().integer().min(1).required().messages({
					"number.base": `'order' in destination item must be a number.`,
					"number.integer": `'order' in destination item must be an integer.`,
					"number.min": `'order' in destination item must be at least 1.`,
					"any.required": `'order' in destination item is required.`,
				}),
				transforms: Joi.array()
					.items(
						Joi.object(transformObj).messages({
							"object.base": `'transforms' items must be an object.`,
						})
					)
					.min(1)
					.allow(null)
					.optional()
					.messages({
						"array.base": `'transforms' must be an array.`,
						"array.min": `'transforms' must contain at least one item.`,
					}),
			})
				.required()
				.messages({
					"object.base": `destination 'configs' item must be an object.`,
				})
		)
		.min(1)
		.required()
		.messages({
			"array.base": `destination 'configs' must be an array.`,
			"array.min": `destination 'configs' must contain at least one item.`,
			"any.required": `destination 'configs' is a required.`,
		}),
};

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
			name: Joi.string().max(50).required().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 50 characters.`,
				"any.required": `'name' is required.`,
			}),
			description: Joi.string().allow(null, "").max(250).optional().messages({
				"string.base": `'description' must be a string, null or ''.`,
				"string.max": `'description' must not exceed 250 characters.`,
			}),
			source: Joi.object(srcObj).required().messages({
				"object.base": `'source' must be an object.`,
				"any.required": `'source' is required.`,
			}),
			destination: Joi.object(dstObj).required().messages({
				"object.base": `'destination' must be an object.`,
				"any.required": `'destination' is required.`,
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
			name: Joi.string().max(50).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 50 characters.`,
			}),
			description: Joi.string().allow(null, "").max(1000).optional().messages({
				"string.base": `'description' must be a string.`,
				"string.max": `'description' must not exceed 1000 characters.`,
			}),
			source: Joi.object(srcObj).optional().messages({
				"object.base": `'source' must be an object.`,
			}),
			destination: Joi.object(dstObj).optional().messages({
				"object.base": `'destination' must be an object.`,
			}),
		})
			.required()
			.or("name", "description", "source", "destination")
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
				"object.missing": `'pipeline_id' and at least one field to update must be provided.`,
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
