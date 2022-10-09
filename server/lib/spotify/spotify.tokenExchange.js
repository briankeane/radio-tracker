const axios = require("axios");
const encryption = require("./spotify.encryption");
const qs = require("querystring");

const authHeader =
  "Basic " +
  Buffer.from(
    process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
  ).toString("base64");
const clientCallback = "playola-oauth://spotify";
const spotifyEndpoint = "https://accounts.spotify.com/api/token";

function swapCodeForToken({ redirect_uri, code }) {
  return new Promise((resolve, reject) => {
    const body = {
      grant_type: "authorization_code",
      redirect_uri: redirect_uri || clientCallback,
      code,
    };

    const config = {
      headers: {
        Authorization: authHeader,
      },
    };

    axios
      .post(spotifyEndpoint, qs.stringify(body), config)
      .then((res) => {
        res.data.refresh_token = encryption.encrypt(res.data.refresh_token);
        return resolve(res.data);
      })
      .catch((err) => reject(err));
  });
}

function refreshTokens({ refresh_token }) {
  return new Promise((resolve, reject) => {
    var decryptedToken = encryption.decrypt(refresh_token);
    const body = {
      grant_type: "refresh_token",
      refresh_token: decryptedToken,
    };
    const config = {
      headers: { Authorization: authHeader },
    };

    axios
      .post(spotifyEndpoint, qs.stringify(body), config)
      .then((res) => {
        if (res.data.refresh_token) {
          res.data.refresh_token = encryption.encrypt(res.data.refresh_token);
        }
        return resolve(res.data);
      })
      .catch((err) => reject(err));
  });
}

module.exports = {
  swapCodeForToken,
  refreshTokens,
};
