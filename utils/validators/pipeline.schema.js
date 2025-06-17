const Joi = require("joi");

const filterSchema = Joi.object({
	type: Joi.string().valid("dynamic", "static").required().messages({
		"string.base": `'type' must be a string.`,
		"any.only": `'type' must be either 'dynamic' or 'static'.`,
		"any.required": `'type' is required.`,
	}),
	fields: Joi.array()
		.items(
			Joi.string().max(50).messages({
				"string.base": `'fields' must contain strings.`,
				"string.max": `Each item in 'fields' must not exceed 50 characters.`,
			})
		)
		.min(1)
		.required()
		.messages({
			"array.base": `'fields' must be an array.`,
			"array.min": `'fields' must contain at least one item.`,
			"any.required": `'fields' is a required in filters item.`,
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
			"any.only": `'operator' must be either "eq", "ne", "gt", "gte", "lt", "lte", "like", "not_like", "in", "not_in", "is", "not", "between", "not_between".`,
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
			Joi.date(),
		])
			.required()
			.messages({
				"any.required": `'value' is required.`,
				"alternatives.types": `'value' must be a string, number, boolean, or date.`,
			}),
	}),
}).messages({
	"object.base": `'transform' item must be an object.`,
});

const transformSchema = Joi.object({
	type: Joi.string()
		.valid("join", "rename", "formula", "map", "filter", "aggregate")
		.required()
		.messages({
			"string.base": `'type' must be a text.`,
			"any.required": `'type' is required.`,
			"any.only": `'type' must be one of 'join', 'rename', 'formula', 'map', 'filter', or 'aggregate'.`,
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

	// CASE: filter
	fields: Joi.when("type", {
		is: "filter",
		then: Joi.string().required().messages({
			"any.required": `'fields' is required when type is 'filter'.`,
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
	target: Joi.when("type", {
		is: "aggregate",
		then: Joi.string().required().messages({
			"any.required": `'target' is required when type is 'aggregate'.`,
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
}).messages({
	"object.base": `'transform' item must be an object.`,
});

const srcSchema = Joi.object({
	api_id: Joi.string().max(50).required().messages({
		"string.base": `source 'api_id' must be a string.`,
		"string.max": `source 'api_id' must not exceed 50 characters.`,
		"any.required": `source 'api_id' is required.`,
	}),
	configs: Joi.array()
		.items(
			Joi.object({
				target: Joi.string().max(50).required().messages({
					"string.base": `'target' must be a string.`,
					"string.max": `'target' must not exceed 50 characters.`,
					"any.required": `'target' is a required in source item.`,
				}),
				name: Joi.string().max(20).required().messages({
					"string.base": `'name' must be a string.`,
					"string.max": `'name' must not exceed 20 characters.`,
					"any.required": `'name' is a required in source item.`,
				}),
				fields: Joi.array()
					.items(
						Joi.string().max(50).messages({
							"string.base": `'fields' must contain strings.`,
							"string.max": `each item in 'fields' must not exceed 50 characters.`,
						})
					)
					.min(1)
					.required()
					.messages({
						"array.base": `'fields' must be an array.`,
						"array.min": `'fields' must contain at least one item.`,
						"any.required": `'fields' is a required in source item.`,
					}),
				filters: Joi.array().items(filterSchema).min(1).required().messages({
					"array.base": `'filters' must be an array.`,
					"array.min": `'filters' must contain at least one item.`,
					"any.required": `'filters' is a required.`,
				}),
				pagination: Joi.object({
					page: Joi.number().integer().min(1).required().messages({
						"number.base": `pagination.page must be a number.`,
						"number.integer": `pagination.page must be an integer.`,
						"number.min": `pagination.page must be at least 1.`,
						"any.required": `pagination.page is required.`,
					}),
					limit: Joi.number().integer().min(5).max(500).required().messages({
						"number.base": `pagination.limit must be a number.`,
						"number.integer": `pagination.limit must be an integer.`,
						"number.min": `pagination.limit must be at least 5.`,
						"number.max": `pagination.limit must be at most 500.`,
						"any.required": `pagination.limit is required.`,
					}),
				})
					.optional()
					.messages({
						"object.base": `pagination must be an object.`,
					}),
			}).messages({
				"object.base": `source 'configs' item must be an object.`,
			})
		)
		.min(1)
		.required()
		.messages({
			"array.base": `source 'configs' must be an array.`,
			"array.min": `source 'configs' must contain at least one item.`,
			"any.required": `source 'configs' is a required.`,
		}),
}).messages({
	"object.base": `'sources' item must be an object.`,
});

const dstSchema = Joi.object({
	api_id: Joi.string().max(50).required().messages({
		"string.base": `destination 'api_id' must be a string.`,
		"string.max": `destination 'api_id' must not exceed 50 characters.`,
		"any.required": `destination 'api_id' is required.`,
	}),
	configs: Joi.array()
		.items(
			Joi.object({
				target: Joi.string().max(50).required().messages({
					"string.base": `'target' in destination item must be a string.`,
					"string.max": `'target' in destination item must not exceed 50 characters.`,
					"any.required": `'target' is a required in destination item.`,
				}),
				name: Joi.string().max(50).required().messages({
					"string.base": `'name' in destination item must be a string.`,
					"string.max": `'name' in destination item must not exceed 50 characters.`,
					"any.required": `'name' in destination item is a required.`,
				}),
				init_source: Joi.string()
					.pattern(/^[a-z]+\.[a-z_]+$/)
					.required()
					.messages({
						"string.pattern.base": `'init_source' must be in format scope.table (e.g. src.invoices).`,
						"any.required": `'init_source' is required.`,
					}),
				order: Joi.number().integer().min(1).required().messages({
					"number.base": `'order' in destination item must be a number.`,
					"number.integer": `'order' in destination item must be an integer.`,
					"number.min": `'order' in destination item must be at least 1.`,
					"any.required": `'order' in destination item is required.`,
				}),
				record_limit: Joi.number()
					.integer()
					.min(5)
					.max(500)
					.optional()
					.messages({
						"number.base": `'record_limit' must be a number.`,
						"number.integer": `'record_limit' must be an integer.`,
						"number.min": `'record_limit' must be at least 5.`,
						"number.max": `'record_limit' must be at most 500.`,
					}),
				fields: Joi.array()
					.items(
						Joi.string().max(50).messages({
							"string.base": `'fields' must contain strings.`,
							"string.max": `Each item in 'fields' must not exceed 50 characters.`,
						})
					)
					.min(1)
					.required()
					.messages({
						"array.base": `'fields' must be an array.`,
						"array.min": `'fields' must contain at least one item.`,
						"any.required": `'fields' is a required in destination item.`,
					}),
				index: Joi.object({
					pk: Joi.string().max(50).required().messages({
						"string.base": `'pk' must be a string.`,
						"string.max": `'pk' must not exceed 50 characters.`,
						"any.required": `'pk' is required.`,
					}),
					fk: Joi.array()
						.allow(null)
						.items(
							Joi.object({
								field: Joi.string().max(50).required().messages({
									"string.base": `'field' must be a string.`,
									"string.max": `'field' must not exceed 50 characters.`,
									"any.required": `'field' is required.`,
								}),
								ref: Joi.string().max(50).required().messages({
									"string.base": `'ref' must be a string.`,
									"string.max": `'ref' must not exceed 50 characters.`,
									"any.required": `'ref' is required.`,
								}),
								ref_field: Joi.string().max(50).required().messages({
									"string.base": `'ref_field' must be a string.`,
									"string.max": `'ref_field' must not exceed 50 characters.`,
									"any.required": `'ref_field' is required.`,
								}),
								on_delete: Joi.string()
									.valid("CASCADE", "SET NULL", "RESTRICT")
									.optional()
									.messages({
										"string.base": `'on_delete' must be a string.`,
										"any.only": `'on_delete' must be either 'CASCADE', 'RESTRICT' or 'SET NULL'.`,
									}),
								on_update: Joi.string()
									.valid("CASCADE", "SET NULL", "RESTRICT")
									.optional()
									.messages({
										"string.base": `'on_update' must be a string.`,
										"any.only": `'on_update' must be either 'CASCADE', 'RESTRICT' or 'SET NULL'.`,
									}),
							}).messages({
								"object.base": `'fk' items must be an object.`,
							})
						)
						.min(1)
						.required()
						.messages({
							"array.base": `'fk' must be an array or null.`,
							"array.min": `'fk' must contain at least one item.`,
							"any.required": `'fk' is required.`,
						}),
					unique: Joi.array()
						.allow(null)
						.items(
							Joi.string().max(50).messages({
								"string.base": `'unique' items must be a string.`,
								"string.max": `'unique' items must not exceed 50 characters.`,
							})
						)
						.min(1)
						.required()
						.messages({
							"array.base": `'unique' must be an array or null.`,
							"array.min": `'unique' must contain at least one item.`,
							"any.required": `'unique' is required.`,
						}),
				})
					.required()
					.messages({
						"object.base": `'index' must be an object.`,
						"any.required": `'index' is required.`,
					}),
				transforms: Joi.array()
					.items(transformSchema)
					.min(1)
					.required()
					.messages({
						"array.base": `'transforms' must be an array.`,
						"array.min": `'transforms' must contain at least one item.`,
						"any.required": `'transforms' is a required.`,
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
}).messages({
	"object.base": `'destinations' item must be an object.`,
});

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
			description: Joi.string().allow(null, "").max(1000).optional().messages({
				"string.base": `'description' must be a string.`,
				"string.max": `'description' must not exceed 1000 characters.`,
			}),
			sources: Joi.array().items(srcSchema).min(1).required().messages({
				"array.base": `'sources' must be an array.`,
				"array.min": `'sources' must contain at least one item.`,
				"any.required": `'sources' is required.`,
			}),
			destinations: Joi.array().items(dstSchema).min(1).required().messages({
				"array.base": `'destinations' must be an array.`,
				"array.min": `'destinations' must contain at least one item.`,
				"any.required": `'destinations' is required.`,
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
			sources: Joi.array().items(srcSchema).min(1).optional().messages({
				"array.base": `sources must be an array.`,
				"array.min": `sources must contain at least one item.`,
			}),
			destinations: Joi.array().items(dstSchema).min(1).optional().messages({
				"array.base": `destinations must be an array.`,
				"array.min": `destinations must contain at least one item.`,
			}),
		})
			.required()
			.or("name", "description", "sources", "destinations")
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
				"object.missing": `'pipeline_id' and at least one of this fields ['name', 'description', 'sources', 'destinations'] must be provided for updates.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	executePipeline(data) {
		const schema = Joi.object({
			action: Joi.string()
				.valid("run", "preview")
				.required()
				.messages({
					"string.base": `'action' must be a string.`,
					"string.max": `'action' must not exceed 50 characters.`,
					"any.required": `'action' is required.`,
				}),

			// EXECUTE RUN
			pipeline_id: Joi.when(Joi.ref("action"), {
				is: Joi.valid("run", "generate"),
				then: Joi.string().max(50).required().messages({
					"string.base": `'pipeline_id' must be a string.`,
					"string.max": `'pipeline_id' must not exceed 50 characters.`,
					"any.required": `'pipeline_id' is required when action 'run' or 'generate'.`,
				}),
				otherwise: Joi.forbidden().messages({
					"any.unknown": `'pipeline_id' is not allowed.`,
				}),
			}),

			// EXECUTE PREVIEW
			sources: Joi.when(Joi.ref("action"), {
				is: "preview",
				then: Joi.array().items(srcSchema).min(1).required().messages({
					"array.base": `sources must be an array.`,
					"array.min": `sources must contain at least one item.`,
					"any.required": `sources is required when action 'preview'.`,
				}),
				otherwise: Joi.forbidden().messages({
					"any.unknown": `'sources' is not allowed.`,
				}),
			}),
			destinations: Joi.when(Joi.ref("action"), {
				is: "preview",
				then: Joi.array().items(dstSchema).min(1).required().messages({
					"array.base": `destinations must be an array.`,
					"array.min": `destinations must contain at least one item.`,
					"any.required": `destinations is required when action 'preview'.`,
				}),
				otherwise: Joi.forbidden().messages({
					"any.unknown": `'destinations' is not allowed.`,
				}),
			}),
		})
			.required()
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	deletePipeline(data) {
		const schema = Joi.object({
			id: Joi.string().max(50).required().messages({
				"string.base": `'pipeline_id (id)' must be a string.`,
				"string.max": `'pipeline_id (id)' must not exceed 50 characters.`,
				"any.required": `'pipeline_id (id)' is required when update.`,
			}),
			api_id: Joi.string().max(50).optional().messages({
				"string.base": `'api_id' must be a string.`,
				"string.max": `'api_id' must not exceed 50 characters.`,
				"any.required": `'api_id' is required when update.`,
			}),
		})
			.required()
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request params (for pipeline_id) is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { pipelineSchema };
