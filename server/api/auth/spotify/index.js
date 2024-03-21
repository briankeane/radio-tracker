const express = require('express');
const controller = require('./spotify.controller');
const { checkQueryFor } = require('../../routeValidators');

const router = express.Router({ mergeParams: true });

router.get(
  '/mobile/authorize',
  checkQueryFor(['redirect_uri']),
  controller.redirectToSpotifyForAuthorization
);
router.get(
  '/web/authorize',
  checkQueryFor(['redirect_uri']),
  controller.redirectToSpotifyForAuthorization
);
router.get('/web/code', controller.receiveCode);
router.get('/mobile/code', controller.receiveCode);
router.post('/token/swap', controller.swap);

module.exports = router;
