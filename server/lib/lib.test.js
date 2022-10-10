const { assert } = require("chai");
const lib = require("./lib");
const db = require("../db");
const sinon = require("sinon");
const { clearDatabase } = require("../test/test.helpers");
const spotifyLib = require("./spotify/spotify.lib");
const {
  api_get_me_200,
  api_token_swap_code_200,
} = require("../test/mockResponses/spotify");
const {
  createPlayolaUserSeed,
  createUser,
  createStationSongsWithSongs,
} = require("../test/testDataGenerator");
const encryption = require("./spotify/spotify.encryption");
const eventStream = require("./events");
const events = require("./events/events");
const errors = require("./errors");
const { v4: UUID } = require("uuid");

describe("User library functions", function () {
  before(async function () {
    await clearDatabase(db);
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  describe("User-oriented", function () {
    var playolaUserSeed, getPlayolaUserSeedStub, userCreatedPublishStub;
    const accessToken = "asdfafsd";
    const refreshToken = encryption.encrypt(
      api_token_swap_code_200["refresh_token"]
    );
    const spotifyUserId = "aSpotifyUID";
    const email = api_get_me_200["email"];

    beforeEach(async function () {
      playolaUserSeed = createPlayolaUserSeed({ spotifyUserId, email });
      await db.models.SpotifyUser.create({
        accessToken,
        refreshToken,
        spotifyUserId,
        email,
      });
      userCreatedPublishStub = sinon.stub(eventStream.users, "publish");
      getPlayolaUserSeedStub = sinon
        .stub(spotifyLib, "getPlayolaUserSeed")
        .resolves(playolaUserSeed);
    });

    afterEach(async function () {
      getPlayolaUserSeedStub.restore();
      userCreatedPublishStub.restore();
    });

    describe("CREATE", function () {
      it("just gets a user if they already exist", async function () {
        let existingUser = await db.models.User.create(playolaUserSeed);
        let createdUser = await lib.createUserViaSpotifyRefreshToken({
          refreshToken,
        });
        assert.equal(createdUser.id, existingUser.id);
      });

      it("creates a user if they do not exist", async function () {
        let createdUser = await lib.createUserViaSpotifyRefreshToken({
          refreshToken,
        });
        assert.ok(createdUser);
        assert.equal(createdUser.email, playolaUserSeed.email);
        assert.equal(
          createdUser.profileImageUrl,
          playolaUserSeed.profileImageUrl
        );
        assert.equal(createdUser.spotifyUserId, playolaUserSeed.spotifyUserId);
      });

      it("broadcasts an event if the user was created", async function () {
        let createdUser = await lib.createUserViaSpotifyRefreshToken({
          refreshToken,
        });
        sinon.assert.calledOnce(userCreatedPublishStub);
        sinon.assert.calledWith(userCreatedPublishStub, events.USER_CREATED, {
          user: createdUser,
        });
      });

      it("does not broadcast an event if the user was just updated", async function () {
        await db.models.User.create(playolaUserSeed);
        await lib.createUserViaSpotifyRefreshToken({ refreshToken });
        sinon.assert.notCalled(userCreatedPublishStub);
      });
    });

    describe("GET", function () {
      it("GETS a user", async function () {
        let user = await createUser(db);
        let foundUser = await lib.getUser({ userId: user.id });
        assert.equal(foundUser.id, user.id);
      });
    });
  });

  describe("station-oriented", function () {
    let user, stationSongs, songs;

    beforeEach(async function () {
      user = await createUser(db);
      const result = await createStationSongsWithSongs(db, {
        userId: user.id,
        count: 10,
      });
      stationSongs = result.stationSongs;
      songs = result.songs;
    });

    it("returns User Not Found if the user does not exist", async function () {
      try {
        await lib.getUsersStationSongs({ userId: UUID() });
        assert.fail("error should be thrown");
      } catch (err) {
        assert.equal(err.message, errors.USER_NOT_FOUND);
      }
    });

    it("Gets the stationSongs with audio for a user", async function () {
      songs[3].audioUrl = null;
      await songs[3].save();

      let retrievedStationSongs = await lib.getUsersStationSongs({
        userId: user.id,
      });

      // leaves out the one with no audioUrl
      assert.equal(retrievedStationSongs.length, stationSongs.length - 1);
      let retrievedStationSongIds = retrievedStationSongs.map(
        (ss) => ss.songId
      );
      assert.notInclude(retrievedStationSongIds, stationSongs[3].id);

      // properly formatted nd populated
      assert.isOk(retrievedStationSongs[0].song);
      assert.isOk(retrievedStationSongs[0].song.id);
      assert.isOk(retrievedStationSongs[0].song.title);
      assert.isOk(retrievedStationSongs[0].userId);
      assert.isOk(retrievedStationSongs[0].songId);
    });
  });
});
