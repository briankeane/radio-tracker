const express = require("express");
const controller = require("./healthCheck.controller");

const router = express.Router();

router.get("/", controller.index);

module.exports = router;
