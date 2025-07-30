const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { PageController } = require("../controllers/page.controller");

const router = express.Router();

router.get("/signin", PageController.signin);

router.get("/dashboard", authorization, PageController.dashboard);
router.get("/database", authorization, PageController.database);
router.get("/pipeline", authorization, PageController.pipeline);
router.get("/job", authorization, PageController.job);
router.get("/log", authorization, PageController.log);
router.get("/user", authorization, PageController.user);
router.get("/profile", authorization, PageController.profile);

module.exports = router;
