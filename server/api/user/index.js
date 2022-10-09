const express = require("express");
const controller = require("./user.controller");
const { authenticate } = require("../security");

const router = express.Router();

router.post("/", controller.createUser);
router.get("/:userId", authenticate, controller.getUser);
router.get("/me/stationSongs", authenticate, controller.getUsersStationSongs);

module.exports = router;
