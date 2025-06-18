const Joi = require("joi");

const userSchema = {
	filterUser(data) {
		const schema = Joi.object({
			user_id: Joi.string().max(50).messages({
				"string.base": `'user_id' must be a text.`,
				"string.max": `'user_id' must not exceed 50 characters.`,
			}),
			name: Joi.string().max(100).messages({
				"string.base": `'name' must be a text.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			email: Joi.string().max(100).messages({
				"string.base": `'email' must be a text.`,
				"string.max": `'email' must not exceed 100 characters.`,
			}),
			is_active: Joi.boolean().optional().messages({
				"string.base": `'is_active' must be a boolean.`,
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

	signup(data) {
		const schema = Joi.object({
			name: Joi.string().min(3).max(100).required().messages({
				"string.base": `'name' must be a string.`,
				"string.min": `'name' must be at least 3 characters long.`,
				"string.max": `'name' must not exceed 100 characters.`,
				"any.required": `'name' is required.`,
			}),
			email: Joi.string()
				.email({ tlds: { allow: false } })
				.max(100)
				.required()
				.messages({
					"string.base": `'email' must be a string.`,
					"string.email": `please enter a valid 'email' address.`,
					"string.max": `'email' must not exceed 100 characters.`,
					"any.required": `'email' is required.`,
				}),
			password: Joi.string().min(8).max(50).required().messages({
				"string.base": `'password' must be a string.`,
				"string.min": `'password' must be at least 8 characters long.`,
				"string.max": `'password' must not exceed 50 characters.`,
				"any.required": `'password' is required.`,
			}),
		})
			.required()
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	signin(data) {
		const schema = Joi.object({
			email: Joi.string()
				.email({ tlds: { allow: false } })
				.max(100)
				.required()
				.messages({
					"string.base": `'email' must be a string.`,
					"string.email": `please enter a valid 'email' address.`,
					"string.max": `'email' must not exceed 100 characters.`,
					"any.required": `'email' is required.`,
				}),
			password: Joi.string().min(8).max(50).required().messages({
				"string.base": `'password' must be a string.`,
				"string.min": `'password' must be at least 8 characters long.`,
				"string.max": `'password' must not exceed 50 characters.`,
				"any.required": `'password' is required.`,
			}),
		})
			.required()
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
			});

		return schema.validate(data, { abortEarly: false });
	},

	updateUser(data) {
		const schema = Joi.object({
			user_id: Joi.string().max(50).required().messages({
				"string.base": `'user_id' must be a string.`,
				"string.max": `'user_id' must not exceed 50 characters.`,
				"any.required": `'user_id' is required.`,
			}),
			name: Joi.string().min(3).max(100).optional().messages({
				"string.base": `'name' must be a string.`,
				"string.min": `'name' must be at least 3 characters long.`,
				"string.max": `'name' must not exceed 100 characters.`,
			}),
			email: Joi.string()
				.email({ tlds: { allow: false } })
				.max(100)
				.optional()
				.messages({
					"string.base": `'email' must be a string.`,
					"string.email": `please enter a valid 'email' address.`,
					"string.max": `'email' must not exceed 100 characters.`,
				}),
			is_active: Joi.boolean().optional().messages({
				"string.base": `'is_active' must be a boolean.`,
			}),
			password: Joi.object({
				old: Joi.string().min(8).max(50).required().messages({
					"string.base": `'old.password' must be a string.`,
					"string.min": `'old.password' must be at least 8 characters long.`,
					"string.max": `'old.password' must not exceed 50 characters.`,
					"any.required": `'old.password' is required.`,
				}),
				new: Joi.string().min(8).max(50).required().messages({
					"string.base": `'new.password' must be a string.`,
					"string.min": `'new.password' must be at least 8 characters long.`,
					"string.max": `'new.password' must not exceed 50 characters.`,
					"any.required": `'new.password' is required.`,
				}),
			})
				.optional()
				.messages({
					"object.base": `password must be a valid JSON object.`,
				}),
		})
			.required()
			.or("name", "email", "password", "role", "is_active")
			.messages({
				"object.base": `request body must be a valid JSON object.`,
				"any.required": `request body is required.`,
				"object.missing": `'user_id' and at least one of this fields ['name', 'email', 'password', 'role', 'status'] must be provided for updates.`,
			});

		return schema.validate(data, { abortEarly: false });
	},
};

module.exports = { userSchema };
