const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { PageController } = require("../controllers/page.controller");

const router = express.Router();

router.get("/signin", PageController.signin);

router.get("/dashboard", PageController.dashboard);
router.get("/database", PageController.database);
router.get("/pipeline", PageController.pipeline);
router.get("/job", PageController.job);
router.get("/log", PageController.log);
router.get("/user", PageController.user);
router.get("/profile", PageController.profile);

module.exports = router;
