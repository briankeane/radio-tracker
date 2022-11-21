const lib = require("../../lib/lib");
const APIError = require("../apiError");

function findOrCreateSong(req, res) {
  const { spotifyId } = req.body;

  const { spotifyUserId } = req.user;

  lib
    .createSongViaSpotifyId({ spotifyId, spotifyUserId })
    .then((song) => res.status(201).json(song))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

module.exports = {
  findOrCreateSong,
};
