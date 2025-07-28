const { Validator } = require("../utils/validators");
const { responseHandler } = require("../utils/response-handler.util.js");
const { UserService } = require("../services/user.service.js");

class UserController {
	async pageSignin(req, res) {
		try {
			res.render("signin", {
				layout: "main",
				title: "Signin",
				style: "signin.css",
				script: "signin.js",
			});
		} catch (error) {
			console.error(error);
		}
	}

	async pageUser(req, res) {
		try {
		} catch (error) {
			console.error(error);
		}
	}

	async pageUserDetail(req, res) {
		try {
		} catch (error) {
			console.error(error);
		}
	}

	async findSummary(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.filterUser(req.query);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await UserService.find(req.query, "summary");

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
					result = await UserService.find(req.params, "detail");

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

	async update(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.updateUser(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await UserService.update(req.body, req.user);

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
					result = await UserService.delete(req.params, req.user);

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

	async signup(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.signup(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await UserService.signup(req.body, req.user);

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

	async signin(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					const { error } = Validator.signin(req.body);

					if (error) {
						throw Object.assign(new Error(error.details[0].message), {
							code: 400,
						});
					}

					result = await UserService.signin(req.body, req);

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

	async signout(req, res) {
		try {
			let result;
			switch (req.params.version) {
				case "v1":
					result = await UserService.signout(req, res);

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

module.exports = { UserController: new UserController() };
