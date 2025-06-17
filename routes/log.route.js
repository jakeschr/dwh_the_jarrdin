const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { LogController } = require("../controllers/log.controller");

const router = express.Router();

router.get("/:version/log", authorization, LogController.findSummary);
router.get("/:version/log/:id", authorization, LogController.findDetail);
router.delete("/:version/log", authorization, LogController.delete);

module.exports = router;
