const app = require('../../../server');
const request = require('supertest');
const url = require('url');
const { assert } = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const eventStream = require('../../../lib/events');
const events = require('../../../lib/events/events');
const db = require('../../../db');
const encryption = require('../../../lib/spotify/spotify.encryption');
const { SPOTIFY_SCOPES } = require('./spotify.controller');
const {
  clearDatabase,
  checkAndClearNocks,
} = require('../../../test/test.helpers');
const {
  api_token_swap_code_200,
  api_token_swap_refresh_token_200,
  api_get_me_200,
} = require('../../../test/mockResponses/spotify');

describe('Spotify Authorization', function () {
  before(async function () {
    await clearDatabase(db);
  });

  afterEach(async function () {
    checkAndClearNocks(nock);
    await clearDatabase(db);
  });

  describe('Redirect', function () {
    it('should redirect web client to spotify auth page with scopes', function (done) {
      const serverRedirectUrl = `${process.env.BASE_URL}/v1/auth/spotify/web/code`;
      const clientRedirectUrl = 'playola-oauth://spotify';
      request(app)
        .get('/v1/auth/spotify/web/authorize')
        .query({ redirect_uri: clientRedirectUrl })
        .expect(302)
        .end(function (err, res) {
          if (err) return done(err);
          let query = url.parse(res.header.location, true).query;
          assert.equal(query.scope, SPOTIFY_SCOPES);
          assert.equal(query.response_type, 'code');
          assert.equal(query.redirect_uri, serverRedirectUrl);
          assert.equal(query.client_id, process.env.SPOTIFY_CLIENT_ID);
          done();
        });
    });

    it('should redirect mobile client to spotify auth page with scopes', function (done) {
      const serverRedirectUrl = `${process.env.BASE_URL}/v1/auth/spotify/mobile/code`;
      const clientRedirectUrl = 'http://localhost:3000/thankYou';
      request(app)
        .get('/v1/auth/spotify/mobile/authorize')
        .query({ redirect_uri: clientRedirectUrl })
        .expect(302)
        .end(function (err, res) {
          if (err) return done(err);
          let query = url.parse(res.header.location, true).query;
          assert.equal(query.scope, SPOTIFY_SCOPES);
          assert.equal(query.response_type, 'code');
          assert.equal(query.redirect_uri, serverRedirectUrl);
          assert.equal(query.client_id, process.env.SPOTIFY_CLIENT_ID);
          done();
        });
    });

    it('checks for required redirect_uri coming from client', function (done) {
      request(app)
        .get('/v1/auth/spotify/web/authorize')
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          assert.include(res.text, 'parameter(s) missing');
          assert.include(res.text, 'redirect_uri');
          done();
        });
    });

    it('checks for required redirect_uri coming from mobile', function (done) {
      request(app)
        .get('/v1/auth/spotify/mobile/authorize')
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          assert.include(res.text, 'parameter(s) missing');
          assert.include(res.text, 'redirect_uri');
          done();
        });
    });
  });

  describe('Token Swap', function () {
    describe('when a code is posted', function () {
      let userCreatedPublishStub;
      const code = 'abcdefg';
      const mobileRedirectUri = `${process.env.BASE_URL}/v1/auth/spotify/mobile/code`;
      const webRedirectUri = `${process.env.BASE_URL}/v1/auth/spotify/web/code`;
      let appOnlyReqHeaders, reqheaders, accessToken;

      beforeEach(function () {
        userCreatedPublishStub = sinon.stub(eventStream.allEvents, 'publish');
        accessToken = api_token_swap_code_200['access_token'];
        reqheaders = {
          authorization: `Bearer ${accessToken}`,
        };
        const basicToken = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');
        appOnlyReqHeaders = { Authorization: `Basic ${basicToken}` };

        // once to create spotifyUser, once to create user
        nock('https://api.spotify.com', { reqheaders })
          .get('/v1/me')
          .times(2)
          .reply(200, api_get_me_200);
      });

      afterEach(function () {
        userCreatedPublishStub.restore();
      });

      it('receives a code and redirects to mobile with playolaToken and code', function (done) {
        nock('https://accounts.spotify.com', { headers: appOnlyReqHeaders })
          .post('/api/token', {
            grant_type: 'authorization_code',
            code,
            redirect_uri: webRedirectUri,
          })
          .reply(200, api_token_swap_code_200);

        request(app)
          .get('/v1/auth/spotify/web/code')
          .query({ code })
          .expect(302)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            let { query, location, protocol, host } = url.parse(
              res.header.location,
              true
            );
            assert.isNotEmpty(query.playolaToken);
            assert.equal(query.code, code);
            assert.equal(
              `${process.env.CLIENT_BASE_URL}`,
              `${protocol}//${host}`
            );
            done();
          });
      });

      it.only('receives a code and redirects to web with playolaToken and code', function (done) {
        nock('https://accounts.spotify.com', { headers: appOnlyReqHeaders })
          .post('/api/token', {
            grant_type: 'authorization_code',
            code,
            redirect_uri: mobileRedirectUri,
          })
          .reply(200, api_token_swap_code_200);

        request(app)
          .get('/v1/auth/spotify/mobile/code')
          .query({ code })
          .expect(302)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }
            let { query, location, protocol, host } = url.parse(
              res.header.location,
              true
            );
            assert.isNotEmpty(query.playolaToken);
            assert.equal(query.code, code);
            assert.equal('playola-oauth://spotify', `${protocol}//${host}`);
            done();
          });
      });
    });

    describe('Token Refresh', function () {
      const raw_refresh_token = 'AACFCD125';
      const encrypted_refresh_token = encryption.encrypt(raw_refresh_token);

      beforeEach(function () {
        nock('https://accounts.spotify.com')
          .post('/api/token', {
            grant_type: 'refresh_token',
            refresh_token: raw_refresh_token, // should send spotify the real refresh_token
          })
          .reply(200, api_token_swap_refresh_token_200);
      });

      it('exchanges a refresh_token for a new access_token', function (done) {
        request(app)
          .post('/v1/auth/spotify/token/swap')
          .send({ refresh_token: encrypted_refresh_token })
          .type('form')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert.equal(res.body.token_type, 'Bearer');
            assert.equal(res.body.expires_in, 3600);
            assert.equal(
              api_token_swap_refresh_token_200['access_token'],
              res.body.access_token
            );
            done();
          });
      });
    });
  });
});
