const express = require("express");
const controller = require("./spotify.controller");
const { checkQueryFor } = require("../../routeValidators");

const router = express.Router({ mergeParams: true });

router.get(
  "/authorize",
  checkQueryFor(["redirect_uri"]),
  controller.redirectToSpotifyForAuthorization
);
router.post("/token/swap", controller.swap);

module.exports = router;
