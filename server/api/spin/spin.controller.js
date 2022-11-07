const lib = require("../../lib/lib");
const playlistLib = require("../../lib/playlists/playlistGenerator");
const APIError = require("../apiError");
const { generateToken } = require("../../lib/jwt");

function moveSpin(req, res) {
  const { spinId } = req.params;
  const { newPlaylistPosition } = req.body;

  playlistLib
    .moveSpin({ spinId, newPlaylistPosition })
    .then((user) => res.status(200).json(user))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

module.exports = {
  moveSpin,
};
