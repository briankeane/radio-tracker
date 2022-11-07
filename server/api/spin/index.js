const express = require("express");
const controller = require("./spin.controller");
const { authenticate } = require("../security");

const router = express.Router();

// router.post("/", controller.createUser);
router.put("/:spinId", authenticate, controller.moveSpin);

module.exports = router;
