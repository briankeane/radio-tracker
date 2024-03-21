const querystring = require('querystring');
const tokenExchange = require('../../../lib/spotify/spotify.tokenExchange');
const {
  findOrCreateSpotifyUser,
  SPOTIFY_SCOPES,
} = require('../../../lib/spotify/spotify.lib');
const logger = require('../../../logger');
const { createUserViaSpotifyTokens } = require('../../../lib/lib');
const { generateToken } = require('../../../lib/jwt');

const REDIRECT_URIS = {
  web: {
    server: `${process.env.BASE_URL}/v1/auth/spotify/web/code`,
    client: `${process.env.CLIENT_BASE_URL}/thankYou`,
  },
  mobile: {
    server: `${process.env.BASE_URL}/v1/auth/spotify/mobile/code`,
    client: 'playola-oauth://spotify',
  },
};

function authSourceFromIncomingUrl(incomingUrl) {
  return incomingUrl.includes('web') ? 'web' : 'mobile';
}

function redirectToSpotifyForAuthorization(req, res) {
  const auth_source = authSourceFromIncomingUrl(req.url);
  const query = querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: REDIRECT_URIS[auth_source].server,
    state: req.query.state,
  });
  return res.redirect('https://accounts.spotify.com/authorize?' + query);
}

// use the code to find or create spotify user, then redirect
// back to the client
async function receiveCode(req, res) {
  const authSource = authSourceFromIncomingUrl(req.url);
  const { code } = req.query;
  try {
    let spotifyResponse = await tokenExchange.swapCodeForToken({
      code,
      redirect_uri: REDIRECT_URIS[authSource].server,
    });
    let spotifyUser = await findOrCreateSpotifyUser({
      accessToken: spotifyResponse.access_token,
      refreshToken: spotifyResponse.refresh_token,
    });
    let user = await createUserViaSpotifyTokens({
      accessToken: spotifyUser.accessToken,
      refreshToken: spotifyUser.refreshToken,
    });
    let newQuery = {
      ...req.query,
      playolaToken: await generateToken(user),
    };
    return res.redirect(
      REDIRECT_URIS[authSource].client + `?${querystring.stringify(newQuery)}`
    );
  } catch (err) {
    logger.error(err);
    return res.status(500).json(err);
  }
}

// refresh a token
async function swap(req, res, next) {
  const { code, refresh_token, redirect_uri } = req.body;
  try {
    let body = await tokenExchange.refreshTokens({ refresh_token });
    return res.status(200).json(body);
  } catch (err) {
    logger.error(err);
    return res.status(500).json(err);
  }
}

module.exports = {
  redirectToSpotifyForAuthorization,
  receiveCode,
  swap,
  SPOTIFY_SCOPES,
};
