const Joi = require("joi");

const templateSchema = {
	filterTemplate(data, type) {
		const baseSchema = {
			template_id: Joi.string().max(50).messages({
				"string.base": `'template_id' must be a string.`,
				"string.max": `'template_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
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
		};

		if (type === "asset") {
			baseSchema.template_asset_id = Joi.string().max(50).messages({
				"string.base": `'template_asset_id' must be a string.`,
				"string.max": `'template_asset_id' must not exceed 50 characters.`,
			});
		}

		const schema = Joi.object(baseSchema).and("page", "limit").messages({
			"object.and": `'page' and 'limit' must be provided together or not at all.`,
		});

		return schema.validate(data, { abortEarly: false });
	},

	createTemplate(data) {
		const schema = Joi.object({
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
			placeholders: Joi.object().allow(null).required().messages({
				"object.base": `placeholders must be a valid JSON object.`,
				"any.required": `placeholders is required.`,
			}),
		})
			.required()
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	updateTemplate(data, type) {
		const schema = Joi.object({
			template_id: Joi.string().max(50).required().messages({
				"string.base": `'template_id' must be a string.`,
				"string.max": `'template_id' must not exceed 50 characters.`,
				"any.required": `'template_id' is required.`,
			}),
			name: Joi.string().max(100).messages({
				"string.base": `'name' must be a string.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			description: Joi.string().allow(null, "").max(1000).messages({
				"string.base": `'description' must be a string.`,
				"string.max": `'description' must not exceed 1000 characters.`,
			}),
			placeholders: Joi.object().allow(null).messages({
				"object.base": `placeholders must be a valid JSON object.`,
			}),
		})
			.required()
			.or("name", "description", "path", "placeholders")
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'template_id' and at least one of these fields ['name', 'description', 'path', 'placeholders'] must be provided for updates.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	generateTemplate(data) {
		const schema = Joi.object({
			template_id: Joi.string().max(50).required().messages({
				"string.base": `'template_id' must be a string.`,
				"string.max": `'template_id' must not exceed 50 characters.`,
				"any.required": `'template_id' is required.`,
			}),
			pipeline_id: Joi.string().max(50).optional().messages({
				"string.base": `'pipeline_id' must be a string.`,
				"string.max": `'pipeline_id' must not exceed 50 characters.`,
			}),
			placeholders: Joi.object().allow(null).messages({
				"object.base": `placeholders must be a valid JSON object.`,
			}),
		})
			.required()
			.or("pipeline_id", "placeholders")
			.messages({
				"object.base": `request body must be an object.`,
				"any.required": `request body is required.`,
				"object.missing": `'template_id' and at least one of these fields ['pipeline_id', 'placeholders'] must be provided for generate.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { templateSchema };
