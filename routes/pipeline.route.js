const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { PipelineController } = require("../controllers/pipeline.controller");

const router = express.Router();

router.post(
	"/:version/pipeline/execute",
	authorization,
	PipelineController.execute
);

router.get("/:version/pipeline", authorization, PipelineController.findSummary);
router.get(
	"/:version/pipeline/:id",
	authorization,
	PipelineController.findDetail
);
router.post("/:version/pipeline", authorization, PipelineController.create);
router.patch("/:version/pipeline", authorization, PipelineController.update);
router.delete(
	"/:version/pipeline/:id",
	authorization,
	PipelineController.delete
);

module.exports = router;
