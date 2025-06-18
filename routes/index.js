const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const userRoute = require("./user.route");
// const databaseRoute = require("./database.route");
// const pipelineRoute = require("./pipeline.route");
// const jobRoute = require("./job.route");
// const logRoute = require("./log.route");

router.get("/", (req, res) => {
	res.status(200).json("Wellcome to Website Content Generator APIs");
});

router.use("/", authRoute);
router.use("/", userRoute);
// router.use("/", databaseRoute);
// router.use("/", pipelineRoute);
// router.use("/", jobRoute);
// router.use("/", logRoute);

module.exports = { router };
