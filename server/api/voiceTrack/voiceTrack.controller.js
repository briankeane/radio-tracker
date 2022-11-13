const lib = require("../../lib/lib");
const APIError = require("../apiError");
const { generateToken } = require("../../lib/jwt");

function createVoiceTrack(req, res) {
  const { filename, durationMS } = req.body;
  const userId = req.user.id;

  lib
    .createVoiceTrack({ filename, durationMS })
    .then((voiceTrack) => res.status(201).json(voiceTrack))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

module.exports = {
  createVoiceTrack,
};
