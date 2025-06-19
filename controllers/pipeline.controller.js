const { Validator } = require("../utils/validators/index.js");
const { responseHandler } = require("../utils/response-handler.util.js");
const { PipelineService } = require("../services/pipeline.service.js");

class PipelineController {
	async findSummary(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.filterPipeline(req.query);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await PipelineService.find(req.query, "summary");

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
					result = await PipelineService.find(req.params, "detail");

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
					const { error } = Validator.createPipeline(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await PipelineService.create(req.body, req.user);

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
					const { error } = Validator.updatePipeline(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await PipelineService.update(req.body, req.user);

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
					const { error } = Validator.deletePipeline({
						...req.params,
						...req.query,
					});

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await PipelineService.delete(
						{
							...req.params,
							...req.query,
						},
						req.user
					);

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

	async execute(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.executePipeline(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await PipelineService.execute(req.body);

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

module.exports = { PipelineController: new PipelineController() };
