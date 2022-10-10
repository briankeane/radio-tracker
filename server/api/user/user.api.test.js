const app = require("../../server");
const request = require("supertest");
const { assert } = require("chai");
const db = require("../../db");
const { clearDatabase } = require("../../test/test.helpers");
const encryption = require("../../lib/spotify/spotify.encryption");
const jwt = require("jsonwebtoken");
const { api_get_me_200 } = require("../../test/mockResponses/spotify");
const sinon = require("sinon");
const service = require("../../lib/spotify/spotify.service");
const {
  createUser,
  createSpotifyUser,
  createStationSongsWithSongs,
} = require("../../test/testDataGenerator");
const { generateToken } = require("../../lib/jwt");

describe("User", function () {
  afterEach(async function () {
    await clearDatabase(db);
  });

  before(async function () {
    await clearDatabase(db);
  });

  describe("CREATE", function () {
    let spotifyAccessToken, spotifyRefreshToken, encryptedSpotifyRefreshToken;

    before(async function () {
      spotifyAccessToken = "thisisanaccesstoken";
      spotifyRefreshToken = "thisisaspotifyrefreshtoken";
      encryptedSpotifyRefreshToken = encryption.encrypt(spotifyRefreshToken);
    });

    describe("User already exists", function () {
      let existingUser;
      let getMeStub;

      beforeEach(async function () {
        await createSpotifyUser(db, {
          accessToken: spotifyAccessToken,
          refreshToken: encryptedSpotifyRefreshToken,
        });
        existingUser = await db.models.User.create({
          spotifyUserId: api_get_me_200["id"],
          email: api_get_me_200["email"],
        });
        getMeStub = sinon.stub(service, "getMe").resolves(api_get_me_200);
      });

      afterEach(async function () {
        getMeStub.restore();
      });

      it("should return the existing User", function (done) {
        request(app)
          .post("/v1/users")
          .send({ spotifyRefreshToken: encryptedSpotifyRefreshToken })
          .set("Accept", "application/json")
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err);
            assert.exists(res.body.token);
            jwt.verify(
              res.body.token,
              process.env.JWT_SECRET,
              (err, payload) => {
                assert.equal(payload.email, existingUser.email);
                assert.equal(
                  payload.profileImageUrl,
                  existingUser.profileImageUrl
                );
                assert.equal(payload.role, existingUser.role);
                assert.equal(payload.displayName, existingUser.displayName);
                assert.equal(payload.id, existingUser.id.toString());
                done();
              }
            );
          });
      });
    });
  });

  describe("with Auth", function () {
    let user, authToken;

    beforeEach(async function () {
      user = await createUser(db);
      authToken = await generateToken(user);
    });

    it("returns the current user", function (done) {
      request(app)
        .get("/v1/users/me")
        .set("Accept", "application/json")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          assert.equal(res.body.email, user.email);
          assert.equal(res.body.profileImageUrl, user.profileImageUrl);
          assert.equal(res.body.role, user.role);
          assert.equal(res.body.displayName, user.displayName);
          assert.equal(res.body.id, user.id.toString());
          done();
        });
    });

    describe("StationSongs", function () {
      // let stationSongs, songs;
      let songs;

      beforeEach(async function () {
        const result = await createStationSongsWithSongs(db, {
          userId: user.id,
          count: 10,
        });
        stationSongs = result.stationSongs;
        songs = result.songs;
        songs[3].audioUrl = null;
        await songs[3].save();
      });

      it("returns the users StationSongs", function (done) {
        request(app)
          .get("/v1/users/me/stationSongs")
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert.equal(res.body.stationSongs.length, stationSongs.length - 1);
            // properly formatted nd populated
            assert.isOk(res.body.stationSongs[0].song);
            assert.isOk(res.body.stationSongs[0].song.id);
            assert.isOk(res.body.stationSongs[0].song.title);
            assert.isOk(res.body.stationSongs[0].userId);
            assert.isOk(res.body.stationSongs[0].songId);
            done();
          });
      });
    });
  });
});
