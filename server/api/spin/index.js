const express = require("express");
const controller = require("./spin.controller");
const { authenticate } = require("../security");

const router = express.Router();

router.post("/", authenticate, controller.insertSpin);
router.put("/:spinId", authenticate, controller.moveSpin);
router.delete("/:spinId", authenticate, controller.deleteSpin);

module.exports = router;
