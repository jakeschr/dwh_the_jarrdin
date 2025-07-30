const { Validator } = require("../utils/validators/index.js");
const { responseHandler } = require("../utils/response-handler.util.js");
const { UserService } = require("../services/user.service.js");
const { DatabaseService } = require("../services/pipeline.service.js");
const { PipelineService } = require("../services/database.service.js");
const { JobService } = require("../services/job.service.js");
const { LogService } = require("../services/log.service.js");

class PageController {
	async signin(req, res) {
		try {
			res.render("signin", {
				layout: "main",
				title: "Signin",
				style: "signin.css",
				script: "signin.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async dashboard(req, res) {
		try {
			res.render("dashboard", {
				layout: "main",
				title: "Dashboard",
				style: "dashboard.css",
				script: "dashboard.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async database(req, res) {
		try {
			res.render("database", {
				layout: "main",
				title: "Database",
				style: "database.css",
				script: "database.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async pipeline(req, res) {
		try {
			res.render("pipeline", {
				layout: "main",
				title: "Pipeline",
				style: "pipeline.css",
				script: "pipeline.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async job(req, res) {
		try {
			res.render("job", {
				layout: "main",
				title: "Job",
				style: "job.css",
				script: "job.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async log(req, res) {
		try {
			res.render("log", {
				layout: "main",
				title: "Log",
				style: "log.css",
				script: "log.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async user(req, res) {
		try {
			res.render("user", {
				layout: "main",
				title: "User",
				style: "user.css",
				script: "user.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}

	async profile(req, res) {
		try {
			res.render("profile", {
				layout: "main",
				title: "Profile",
				style: "profile.css",
				script: "profile.js",
				session: req.user,
			});
		} catch (error) {
			console.error(error);
		}
	}
}

module.exports = { PageController: new PageController() };
