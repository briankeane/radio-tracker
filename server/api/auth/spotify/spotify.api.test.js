const app = require("../../../server");
const request = require("supertest");
const url = require("url");
const { assert } = require("chai");
const nock = require("nock");
const db = require("../../../db");
const encryption = require("../../../lib/spotify/spotify.encryption");
const { SPOTIFY_SCOPES } = require("./spotify.controller");
const {
  clearDatabase,
  checkAndClearNocks,
} = require("../../../test/test.helpers");
const {
  api_token_swap_code_200,
  api_token_swap_refresh_token_200,
  api_get_me_200,
} = require("../../../test/mockResponses/spotify");

describe("Spotify Authorization", function () {
  before(async function () {
    await clearDatabase(db);
  });

  afterEach(async function () {
    checkAndClearNocks(nock);
    await clearDatabase(db);
  });

  describe("Redirect", function () {
    it("should redirect to spotify auth page with scopes", function (done) {
      const redirect_uri = "playola-oauth://spotify";
      request(app)
        .get("/v1/auth/spotify/authorize")
        .query({ redirect_uri: redirect_uri })
        .expect(302)
        .end(function (err, res) {
          if (err) return done(err);
          let query = url.parse(res.header.location, true).query;
          assert.equal(query.scope, SPOTIFY_SCOPES);
          assert.equal(query.response_type, "code");
          assert.equal(query.redirect_uri, redirect_uri);
          assert.equal(query.client_id, process.env.SPOTIFY_CLIENT_ID);
          done();
        });
    });

    it("checks for required redirect_uri", function (done) {
      request(app)
        .get("/v1/auth/spotify/authorize")
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          assert.include(res.text, "parameter(s) missing");
          assert.include(res.text, "redirect_uri");
          done();
        });
    });
  });

  describe("Token Swap", function () {
    describe("when a code is posted", function () {
      const code = "abcdefg";
      const redirect_uri = "playola-oauth://spotify";

      let appOnlyReqHeaders, reqheaders, accessToken;

      beforeEach(function () {
        accessToken = api_token_swap_code_200["access_token"];
        reqheaders = { Authorization: `Bearer ${accessToken}` };
        const basicToken = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64");
        appOnlyReqHeaders = { Authorization: `Basic ${basicToken}` };

        nock("https://accounts.spotify.com", { appOnlyReqHeaders })
          .post("/api/token", {
            grant_type: "authorization_code",
            code,
            redirect_uri,
          })
          .reply(200, api_token_swap_code_200);

        // If exchanging code, it'll get info and create user
        nock("https://api.spotify.com", { reqheaders })
          .get("/v1/me")
          .reply(200, api_get_me_200);
      });

      it("exchanges a code for an access_token and refresh_token", function (done) {
        request(app)
          .post("/v1/auth/spotify/token/swap")
          .send({ code })
          .type("form")
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert.equal(res.body.token_type, "Bearer");
            assert.equal(res.body.expires_in, 3600);
            assert.equal(
              encryption.decrypt(res.body.refresh_token),
              api_token_swap_code_200["refresh_token"]
            );
            assert.equal(
              api_token_swap_code_200["access_token"],
              res.body.access_token
            );
            done();
          });
      });

      it("creates a spotifyUser when the code is exchanged", function (done) {
        request(app)
          .post("/v1/auth/spotify/token/swap")
          .send({ code })
          .type("form")
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            db.models.SpotifyUser.findOne({
              where: {
                refreshToken: encryption.encrypt(
                  api_token_swap_code_200["refresh_token"]
                ),
              },
            })
              .then((spotifyUser) => {
                assert.equal(
                  spotifyUser.accessToken,
                  api_token_swap_code_200["access_token"]
                );
                assert.equal(
                  spotifyUser.refreshToken,
                  encryption.encrypt(api_token_swap_code_200["refresh_token"])
                );
                assert.equal(spotifyUser.spotifyUserId, api_get_me_200["id"]);
                done();
              })
              .catch((err) => done(err));
          });
      });
    });

    describe("Token Refresh", function () {
      const raw_refresh_token = "AACFCD125";
      const encrypted_refresh_token = encryption.encrypt(raw_refresh_token);

      beforeEach(function () {
        nock("https://accounts.spotify.com")
          .post("/api/token", {
            grant_type: "refresh_token",
            refresh_token: raw_refresh_token, // should send spotify the real refresh_token
          })
          .reply(200, api_token_swap_refresh_token_200);
      });

      it("exchanges a refresh_token for a new access_token", function (done) {
        request(app)
          .post("/v1/auth/spotify/token/swap")
          .send({ refresh_token: encrypted_refresh_token })
          .type("form")
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert.equal(res.body.token_type, "Bearer");
            assert.equal(res.body.expires_in, 3600);
            assert.equal(
              api_token_swap_refresh_token_200["access_token"],
              res.body.access_token
            );
            done();
          });
      });
    });
  });
});
