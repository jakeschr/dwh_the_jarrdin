const express = require("express");
const { AuthController } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/api/:version/auth/signup", AuthController.signup);
router.post("/api/:version/auth/signin", AuthController.signin);
router.delete("/api/:version/auth/signout", AuthController.signout);

module.exports = router;
