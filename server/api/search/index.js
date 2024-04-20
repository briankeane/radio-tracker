const express = require('express');
const controller = require('./search.controller');

const router = express.Router();

router.get('/', controller.index);
router.get('/nowPlaying', controller.nowPlaying);

module.exports = router;
