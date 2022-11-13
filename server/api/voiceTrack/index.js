const express = require("express");
const controller = require("./voiceTrack.controller");
const { authenticate } = require("../security");

const router = express.Router();

router.post("/uploadUrl", authenticate, controller.createUploadUrl);
router.post("/", authenticate, controller.createVoiceTrack);

module.exports = router;
