const express = require("express");
const controller = require("./voiceTrack.controller");
const { authenticate } = require("../security");

const router = express.Router();

// router.post("/", controller.createUser);
router.post("/", authenticate, controller.createVoiceTrack);

module.exports = router;
