const express = require("express");
const controller = require("./song.controller");
const { authenticate } = require("../security");

const router = express.Router();

router.post("/", authenticate, controller.findOrCreateSong);

module.exports = router;
