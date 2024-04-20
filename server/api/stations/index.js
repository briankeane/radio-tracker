const express = require('express');
const controller = require('./stations.controller');

const router = express.Router();

router.post('/:stationId/poll', controller.pollStation);
router.post('/', controller.createStation);

module.exports = router;
