const lib = require("../../lib/lib");
const APIError = require("../apiError");
const { generateToken } = require("../../lib/jwt");

function insertSpin(req, res) {
  const { playlistPosition, audioBlockId } = req.body;
  const userId = req.user.id;

  lib
    .insertSpin({ userId, playlistPosition, audioBlockId })
    .then((user) => res.status(200).json(user))
    .catch((err) => APIError.APIResponseFromPlayolaError(err, res));
}

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

function createUploadUrl(req, res) {
  const { presignedUrl, filename } = lib.createPresignedUploadUrl({
    userId: req.user.id,
  });
  console.log("uploadUrl: ", presignedUrl);
  return res.status(200).json({ presignedUrl, filename });
}
module.exports = {
  insertSpin,
  moveSpin,
  deleteSpin,
  createUploadUrl,
};
