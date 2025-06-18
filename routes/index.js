const express = require("express");
const router = express.Router();

const userRoute = require("./user.route");
const databaseRoute = require("./database.route");
// const pipelineRoute = require("./pipeline.route");
// const jobRoute = require("./job.route");
// const logRoute = require("./log.route");

router.get("/", (req, res) => {
	res.status(200).json("Wellcome to Website Content Generator APIs");
});

router.use("/api", userRoute);
router.use("/api", databaseRoute);
// router.use("/api", pipelineRoute);
// router.use("/api", jobRoute);
// router.use("/api", logRoute);

module.exports = { router };
