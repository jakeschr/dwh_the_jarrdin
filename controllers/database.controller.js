const { Validator } = require("../utils/validators/index.js");
const { responseHandler } = require("../utils/response-handler.util.js");
const { DatabaseService } = require("../services/database.service.js");

class DatabaseController {
	async findSummary(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.filterDatabase(req.query);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await DatabaseService.find(req.query, "summary");

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result.data,
				meta: result.meta,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async findDetail(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					result = await DatabaseService.find(req.params, "detail");

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async create(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.createDatabase(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await DatabaseService.create(req.body, req.user);

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 201,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async update(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.updateDatabase(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await DatabaseService.update(req.body, req.user);

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async delete(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					result = await DatabaseService.delete(req.params, req.user);

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async connectionTest(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					result = await DatabaseService.connectionTest(req.params);

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}

	async createTable(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.createTable(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await DatabaseService.createTable(req.body, req.user);

					break;
				default:
					throw Object.assign(
						new Error(`Unsupported endpoint version: ${req.params.version}`),
						{
							code: 400,
						}
					);
			}

			responseHandler(res, {
				code: 200,
				data: result,
			});
		} catch (error) {
			console.error(error);
			responseHandler(res, {
				code: error.code || 500,
				errors: error.message,
			});
		}
	}
}

module.exports = { DatabaseController: new DatabaseController() };
