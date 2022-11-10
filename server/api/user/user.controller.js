const lib = require("../../lib/lib");
const APIError = require("../apiError");
const { generateToken } = require("../../lib/jwt");

function createUser(req, res) {
  const { spotifyRefreshToken } = req.body;

  lib
    .createUserViaSpotifyRefreshToken({ refreshToken: spotifyRefreshToken })
    .then((user) => generateToken(user))
    .then((token) => res.status(201).json({ token }))
    .catch((err) => res.status(400).json(err));
}

function getUser(req, res) {
  const isMe = req.params?.userId === "me";
  const userId = isMe ? req.user.id : req.params.userId;

  lib
    .getUser({ userId, extendedPlaylist: isMe })
    .then((user) => {
      return res.status(200).json(user);
    })
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

function getUsersStationSongs(req, res) {
  const { user } = req;

  lib
    .getUsersStationSongs({ userId: user.id })
    .then((stationSongs) => res.status(200).send({ stationSongs }))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

module.exports = {
  createUser,
  getUser,
  getUsersStationSongs,
};
