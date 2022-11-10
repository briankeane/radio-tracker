const lib = require("../../lib/lib");
const APIError = require("../apiError");
const { generateToken } = require("../../lib/jwt");

function moveSpin(req, res) {
  const { spinId } = req.params;
  const { newPlaylistPosition } = req.body;
  const userId = req.user.id;

  lib
    .moveSpin({ userId, spinId, newPlaylistPosition })
    .then((user) => res.status(200).json(user))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

function deleteSpin(req, res) {
  const { spinId } = req.params;
  const userId = req.user.id;

  lib
    .deleteSpin({ spinId, userId })
    .then((user) => res.status(200).json(user))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

module.exports = {
  moveSpin,
  deleteSpin,
};
