const { Validator } = require("../utils/validators/index.js");
const { responseHandler } = require("../utils/response-handler.util.js");
const { LogService } = require("../services/log.service.js");

class LogController {
	async findSummary(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.filterLog(req.query);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await LogService.find(req.query, "summary");

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
					result = await LogService.find(req.params, "detail");

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
					const { error } = Validator.deleteLog(req.query);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await LogService.delete(req.query);

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

module.exports = { LogController: new LogController() };
