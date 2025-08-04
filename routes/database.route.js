const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { DatabaseController } = require("../controllers/database.controller");

const router = express.Router();

router.get(
	"/:version/database/connection/:id",
	authorization, //
	DatabaseController.connectionTest
);

router.post(
	"/:version/database/create-table",
	authorization, //
	DatabaseController.createTable
);

router.get(
	"/:version/database",
	authorization, //
	DatabaseController.findSummary
);
router.get(
	"/:version/database/:id",
	authorization,
	DatabaseController.findDetail
);
router.post(
	"/:version/database",
	authorization, //
	DatabaseController.create
);
router.patch(
	"/:version/database",
	authorization, //
	DatabaseController.update
);
router.delete(
	"/:version/database/:id",
	authorization, //
	DatabaseController.delete
);

module.exports = router;
