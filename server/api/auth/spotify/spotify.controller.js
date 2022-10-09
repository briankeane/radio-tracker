const querystring = require("querystring");
const tokenExchange = require("../../../lib/spotify/spotify.tokenExchange");
const {
  createSpotifyUser,
  SPOTIFY_SCOPES,
} = require("../../../lib/spotify/spotify.lib");
const logger = require("../../../logger");

function redirectToSpotifyForAuthorization(req, res) {
  const query = querystring.stringify({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: req.query.redirect_uri,
    state: req.query.state,
  });
  return res.redirect("https://accounts.spotify.com/authorize?" + query);
}

async function swap(req, res, next) {
  const { code, refresh_token, redirect_uri } = req.body;
  let body;
  try {
    if (code) {
      body = await tokenExchange.swapCodeForToken({ code, redirect_uri });
      await createSpotifyUser({
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
      });
    } else {
      body = await tokenExchange.refreshTokens({ refresh_token });
    }
    return res.status(200).json(body);
  } catch (err) {
    logger.error(err);
    return res.status(400).json(err);
  }
}

module.exports = {
  redirectToSpotifyForAuthorization,
  swap,
  SPOTIFY_SCOPES,
};
