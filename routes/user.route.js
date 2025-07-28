const express = require("express");
const { authorization } = require("../middlewares/authorization.middleware");
const { UserController } = require("../controllers/user.controller");

const router = express.Router();

router.post("/:version/signin", UserController.signin);
router.delete("/:version/signout", UserController.signout);
router.post("/:version/signup", authorization, UserController.signup);
router.get("/:version/user", authorization, UserController.findSummary);
router.get("/:version/user/:id", authorization, UserController.findDetail);
router.patch("/:version/user", authorization, UserController.update);
router.delete("/:version/user/:id", authorization, UserController.delete);

module.exports = router;
