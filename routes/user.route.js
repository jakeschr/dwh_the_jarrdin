const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { UserController } = require("../controllers/user.controller");

const router = express.Router();

router.post("/api/:version/auth/signin", UserController.signin);
router.delete("/api/:version/auth/signout", UserController.signout);
router.post("/api/:version/auth/signup", authorization, UserController.signup);

router.get("/api/:version/user", authorization, UserController.findSummary);
router.get("/api/:version/user/:id", authorization, UserController.findDetail);
router.patch("/api/:version/user", authorization, UserController.update);
router.delete("/api/:version/user/:id", authorization, UserController.delete);

module.exports = router;
