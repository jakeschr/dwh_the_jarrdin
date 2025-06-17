const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { JobController } = require("../controllers/job.controller");

const router = express.Router();

router.get("/:version/job", authorization, JobController.findSummary);
router.get("/:version/job/:id", authorization, JobController.findDetail);
router.post("/:version/job", authorization, JobController.create);
router.patch("/:version/job", authorization, JobController.update);
router.delete("/:version/job/:id", authorization, JobController.delete);

module.exports = router;
