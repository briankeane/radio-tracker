const { assert } = require("chai");
const lib = require("./lib");
const db = require("../db");
const models = db.models;
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
  createSong,
  createPlayolaSongSeeds,
  createStationSongsWithSongs,
  createSpinsWithSongs,
  createSpotifyUser,
} = require("../test/testDataGenerator");
const encryption = require("./spotify/spotify.encryption");
const eventStream = require("./events");
const events = require("./events/events");
const errors = require("./errors");
const nock = require("nock");
const audioProvider = require("../lib/audioProvider");
const { v4: UUID } = require("uuid");

describe("User library functions", function () {
  before(async function () {
    await clearDatabase(db);
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  describe("User-oriented", function () {
    var playolaUserSeed,
      getPlayolaUserSeedStub,
      userCreatedPublishStub,
      audioProviderStub;

    let audioProviderData = {
      audioUrl: "https://www.example.com",
      durationMS: 180000,
      endOfIntroMS: 10000,
      endOfMessageMS: 179000,
      beginningOfOutroMS: 170000,
    };
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
      userCreatedPublishStub = sinon.stub(eventStream.allEvents, "publish");
      getPlayolaUserSeedStub = sinon
        .stub(spotifyLib, "getPlayolaUserSeed")
        .resolves(playolaUserSeed);
      audioProviderStub = sinon
        .stub(audioProvider, "getDataForSong")
        .resolves(audioProviderData);
    });

    afterEach(async function () {
      getPlayolaUserSeedStub.restore();
      userCreatedPublishStub.restore();
      audioProviderStub.restore();
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

      it("GETS a user with a playlist", async function () {
        let user = await createUser(db);
        let { spins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 3,
          startingAirtime: new Date(new Date().getTime() - 5 * 60 * 1000),
        });
        let foundUser = await lib.getUser({ userId: user.id });
        let foundPlaylist = foundUser.get("playlist");
        assert.ok(foundPlaylist);
        assert.equal(foundPlaylist.length, 3);
        assert.sameMembers(
          foundPlaylist.map((spin) => spin.id),
          spins.map((spin) => spin.id)
        );
      });

      it("only gets within a 30 minute window", async function () {
        let user = await createUser(db);
        let { spins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 3,
          startingAirtime: new Date(new Date().getTime() - 5 * 60 * 1000),
        });
        let { spins: tooFarBackSpins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 1,
          startingAirtime: new Date(new Date().getTime() - 30 * 60 * 1000),
        });
        let { spins: tooFarAheadSpins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 1,
          startingAirtime: new Date(new Date().getTime() + 30 * 60 * 1000),
        });
        let foundUser = await lib.getUser({ userId: user.id });
        let foundPlaylist = foundUser.get("playlist");
        assert.ok(foundPlaylist);
        assert.equal(foundPlaylist.length, 3);
        assert.sameMembers(
          foundPlaylist.map((spin) => spin.id),
          spins.map((spin) => spin.id)
        );
        assert.notInclude(
          tooFarAheadSpins.map((spin) => spin.id),
          foundPlaylist.map((spin) => spin.id)
        );
        assert.notInclude(
          tooFarBackSpins.map((spin) => spin.id),
          foundPlaylist.map((spin) => spin.id)
        );
      });

      it("only gets all future spins if asked for 'extendedPlaylist'", async function () {
        let user = await createUser(db);
        let { spins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 3,
          startingAirtime: new Date(new Date().getTime() - 5 * 60 * 1000),
        });
        let { spins: tooFarBackSpins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 1,
          startingAirtime: new Date(new Date().getTime() - 30 * 60 * 1000),
        });
        let { spins: aheadSpins } = await createSpinsWithSongs(db, {
          userId: user.id,
          count: 1,
          startingAirtime: new Date(new Date().getTime() + 30 * 60 * 1000),
        });
        let foundUser = await lib.getUser({
          userId: user.id,
          extendedPlaylist: true,
        });
        let foundPlaylist = foundUser.get("playlist");
        assert.ok(foundPlaylist);
        assert.equal(foundPlaylist.length, 4);
        assert.sameMembers(
          foundPlaylist.map((spin) => spin.id),
          spins.map((spin) => spin.id).concat(aheadSpins[0].id)
        );
        assert.notInclude(
          tooFarBackSpins.map((spin) => spin.id),
          foundPlaylist.map((spin) => spin.id)
        );
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
      await songs[3].save();

      let retrievedStationSongs = await lib.getUsersStationSongs({
        userId: user.id,
      });

      // leaves out the one with no audioUrl
      assert.equal(retrievedStationSongs.length, stationSongs.length);
      let retrievedStationSongIds = retrievedStationSongs.map(
        (ss) => ss.songId
      );

      // properly formatted nd populated
      assert.isOk(retrievedStationSongs[0].song);
      assert.isOk(retrievedStationSongs[0].song.id);
      assert.isOk(retrievedStationSongs[0].song.title);
      assert.isOk(retrievedStationSongs[0].userId);
      assert.isOk(retrievedStationSongs[0].songId);
    });
  });

  /*
   * Songs and StationSongs
   */
  function defaultProps() {
    return {
      title: "Too Much Love",
      artist: "Rachel Loy",
      album: "Not Yet",
      durationMS: 180000,
      popularity: 100,
      youTubeId: "thisfersnet",
      endOfMessageMS: 160000,
      beginningOfOutroMS: 150000,
      endOfIntroMS: 3000,
      audioUrl: "https://songs.playola.fm/tooMuchLove.m4a",
      isrc: "thisisanisrc",
      spotifyId: "thisIsTheSpotifyID",
      imageUrl: "https://pics.albums.images.com/a-pic.jpg",
    };
  }

  /*
   * Helper Functions
   */

  async function createDefaultSong(attrs = {}) {
    return await db.models.Song.create({
      ...defaultProps(),
      ...attrs,
    });
  }

  describe("Song Lib Functions", function () {
    describe("Song Creation Functions", function () {
      var eventsPublishStub, audioProviderStub;
      let audioProviderData = {
        audioUrl: "https://www.example.com",
        durationMS: 180000,
        endOfIntroMS: 10000,
        endOfMessageMS: 179000,
        beginningOfOutroMS: 170000,
      };

      beforeEach(function () {
        eventsPublishStub = sinon.stub(eventStream.allEvents, "publish");
        audioProviderStub = sinon
          .stub(audioProvider, "getDataForSong")
          .resolves(audioProviderData);
      });

      afterEach(async function () {
        eventsPublishStub.restore();
        audioProviderStub.restore();
      });

      describe("CreateSongViaSpotifyId", function () {
        var spotifyTrackStub, songSeed, spotifyUser;

        beforeEach(async function () {
          songSeed = {
            title: "Cut To The Feeling",
            artist: "Carly Rae Jepsen",
            album: "Cut To The Feeling",
            durationMS: 207959,
            popularity: 63,
            isrc: "USUM71703861",
            spotifyId: "11dFghVXANMlKmJXsNCbNl",
            imageUrl:
              "https://i.scdn.co/image/966ade7a8c43b72faa53822b74a899c675aaafee",
          };
          spotifyTrackStub = sinon
            .stub(spotifyLib, "getSongSeedFromSpotifyId")
            .resolves(songSeed);
          spotifyUser = await createSpotifyUser(db);
        });

        afterEach(function () {
          spotifyTrackStub.restore();
        });

        it("creates a song via its spotifyId", async function () {
          let createdSong = await lib.createSongViaSpotifyId({
            spotifyUserId: spotifyUser.spotifyUserId,
            spotifyId: songSeed.spotifyId,
          });
          assert.equal(createdSong.title, songSeed.title);
          assert.equal(createdSong.artist, songSeed.artist);
          assert.equal(createdSong.album, songSeed.album);
          assert.equal(createdSong.popularity, songSeed.popularity);
          assert.equal(createdSong.isrc, songSeed.isrc);
          assert.equal(createdSong.spotifyId, songSeed.spotifyId);
          assert.equal(createdSong.imageUrl, songSeed.imageUrl);

          // While we have dummy music, this is set by the audioGetter
          // assert.equal(createdSong.durationMS, songSeed.durationMS);

          sinon.assert.calledOnce(spotifyTrackStub);
          sinon.assert.calledWith(spotifyTrackStub, {
            spotifyUserId: spotifyUser.spotifyUserId,
            spotifyId: songSeed.spotifyId,
          });
        });

        it("provokes a SONG_CREATED event", async function () {
          await lib.createSongViaSpotifyId({
            spotifyUserId: spotifyUser.spotifyUserId,
            spotifyId: songSeed.spotifyId,
          });
          sinon.assert.calledOnce(eventsPublishStub);
          sinon.assert.calledWith(eventsPublishStub, events.SONG_CREATED);
        });

        it("returns a song if it already exists", async function () {
          let existingSong = await createSong(db, {
            spotifyId: songSeed.spotifyId,
          });
          let createdSong = await lib.createSongViaSpotifyId({
            spotifyUserId: spotifyUser.spotifyUserId,
            spotifyId: songSeed.spotifyId,
          });
          assert.equal(existingSong.id, createdSong.id);
        });
      });

      describe("createSong", function () {
        it("creates a song", async function () {
          let createdSong = await createDefaultSong();
          const expectedProps = defaultProps();
          assert.equal(createdSong.title, expectedProps.title);
          assert.equal(createdSong.artist, expectedProps.artist);
          assert.equal(createdSong.album, expectedProps.album);
          assert.equal(createdSong.durationMS, expectedProps.durationMS);
          assert.equal(createdSong.popularity, expectedProps.popularity);
          assert.equal(
            createdSong.endOfMessageMS,
            expectedProps.endOfMessageMS
          );
          assert.equal(
            createdSong.beginningOfOutroMS,
            expectedProps.beginningOfOutroMS
          );
          assert.equal(createdSong.endOfIntroMS, expectedProps.endOfIntroMS);
          assert.equal(createdSong.audioUrl, expectedProps.audioUrl);
          assert.equal(createdSong.isrc, expectedProps.isrc);
          assert.equal(createdSong.spotifyId, expectedProps.spotifyId);
          assert.equal(createdSong.imageUrl, expectedProps.imageUrl);
        });

        it("only updates if a matching isrc exists", async function () {
          let expectedProps = defaultProps();
          let existingSong = await createDefaultSong({
            title: "dummy",
            artist: "dummy",
            album: "dummy",
            durationMS: 1,
            popularity: 90,
            youTubeId: "dummy",
            endOfMessageMS: 1,
            beginningOfOutroMS: 1,
            endOfIntroMS: 1,
            audioUrl: "dummy",
            isrc: expectedProps.isrc,
            spotifyId: "dummy",
            imageUrl: "dummy",
          });
          let createdSong = await lib.createSong(expectedProps);
          assert.equal(createdSong.title, expectedProps.title);
          assert.equal(createdSong.artist, expectedProps.artist);
          assert.equal(createdSong.album, expectedProps.album);
          assert.equal(createdSong.popularity, expectedProps.popularity);
          assert.equal(createdSong.isrc, expectedProps.isrc);
          assert.equal(createdSong.spotifyId, expectedProps.spotifyId);
          assert.equal(createdSong.imageUrl, expectedProps.imageUrl);
          assert.equal(createdSong.id, existingSong.id);

          // These will change when we start getting real audio
          assert.equal(
            createdSong.endOfMessageMS,
            audioProviderData.endOfMessageMS
          );
          assert.equal(
            createdSong.beginningOfOutroMS,
            audioProviderData.beginningOfOutroMS
          );
          assert.equal(createdSong.audioUrl, audioProviderData.audioUrl);
          assert.equal(createdSong.durationMS, audioProviderData.durationMS);
          assert.equal(
            createdSong.endOfIntroMS,
            audioProviderData.endOfIntroMS
          );
        });

        it("only updates if a matching spotifyId exists", async function () {
          let expectedProps = defaultProps();
          let existingSong = await createDefaultSong({
            title: "dummy",
            artist: "dummy",
            album: "dummy",
            durationMS: 1,
            popularity: 80,
            youTubeId: "dummy",
            endOfMessageMS: 1,
            beginningOfOutroMS: 1,
            endOfIntroMS: 1,
            audioUrl: "dummy",
            isrc: "dummy",
            spotifyId: expectedProps.spotifyId,
          });

          let createdSong = await lib.createSong(expectedProps);
          assert.equal(createdSong.title, expectedProps.title);
          assert.equal(createdSong.artist, expectedProps.artist);
          assert.equal(createdSong.album, expectedProps.album);
          assert.equal(createdSong.popularity, expectedProps.popularity);
          assert.equal(createdSong.isrc, expectedProps.isrc);
          assert.equal(createdSong.spotifyId, expectedProps.spotifyId);
          assert.equal(createdSong.id, existingSong.id);

          // These will change when we start getting real audio
          assert.equal(
            createdSong.endOfMessageMS,
            audioProviderData.endOfMessageMS
          );
          assert.equal(
            createdSong.beginningOfOutroMS,
            audioProviderData.beginningOfOutroMS
          );
          assert.equal(createdSong.audioUrl, audioProviderData.audioUrl);
          assert.equal(createdSong.durationMS, audioProviderData.durationMS);
          assert.equal(
            createdSong.endOfIntroMS,
            audioProviderData.endOfIntroMS
          );
        });

        it("does not trigger the SONG_CREATED event if the song was only updated", async function () {
          let expectedProps = defaultProps();
          await createDefaultSong({
            title: "dummy",
            artist: "dummy",
            album: "dummy",
            durationMS: 1,
            youTubeId: "dummy",
            endOfMessageMS: 1,
            beginningOfOutroMS: 1,
            endOfIntroMS: 1,
            audioUrl: "dummy",
            isrc: "dummy",
            spotifyId: expectedProps.spotifyId,
          });
          await lib.createSong(expectedProps);
          sinon.assert.notCalled(eventsPublishStub);
        });

        it("triggers a SONG_CREATED event if the song was created", async function () {
          await lib.createSong(defaultProps());
          sinon.assert.calledOnce(eventsPublishStub);
          sinon.assert.calledWith(eventsPublishStub, events.SONG_CREATED);
        });

        describe("Requires Song Consolidation", function () {
          let expectedProps, song1, song2;

          beforeEach(async function () {
            expectedProps = defaultProps();
            song1 = await createDefaultSong({
              title: "dummy",
              artist: "dummy",
              album: "dummy",
              durationMS: 1,
              youTubeId: "dummy",
              endOfMessageMS: 1,
              beginningOfOutroMS: 1,
              endOfIntroMS: 1,
              audioUrl: "dummy",
              isrc: undefined,
              spotifyId: expectedProps.spotifyId,
            });
            song2 = await createDefaultSong({
              title: "dummy2",
              artist: "dummy2",
              album: "dummy2",
              durationMS: 2,
              youTubeId: "dummy2",
              endOfMessageMS: 2,
              beginningOfOutroMS: 2,
              endOfIntroMS: 2,
              audioUrl: "dummy2",
              isrc: expectedProps.isrc,
              spotifyId: undefined,
            });
          });

          it("consolidates if spotifyId and isrc exist", async function () {
            let createdSong = await lib.createSong(expectedProps);

            assert.equal(createdSong.title, expectedProps.title);
            assert.equal(createdSong.artist, expectedProps.artist);
            assert.equal(createdSong.album, expectedProps.album);
            assert.equal(createdSong.durationMS, expectedProps.durationMS);
            assert.equal(createdSong.popularity, expectedProps.popularity);
            assert.equal(
              createdSong.endOfMessageMS,
              expectedProps.endOfMessageMS
            );
            assert.equal(
              createdSong.beginningOfOutroMS,
              expectedProps.beginningOfOutroMS
            );
            assert.equal(createdSong.endOfIntroMS, expectedProps.endOfIntroMS);
            assert.equal(createdSong.audioUrl, expectedProps.audioUrl);
            assert.equal(createdSong.isrc, expectedProps.isrc);
            assert.equal(createdSong.spotifyId, expectedProps.spotifyId);
            const oldID = createdSong.id == song1.id ? song2.id : song1.id;
            let shouldBeEmpty = await models.Song.findAll({
              where: { id: oldID },
            });
            assert.equal(shouldBeEmpty.length, 0);
          });

          it("triggers a SONG_CONSOLIDATED event if songs were consolidated", async function () {
            let createdSong = await lib.createSong(expectedProps);
            const oldID = createdSong.id == song1.id ? song2.id : song1.id;
            sinon.assert.calledOnce(eventsPublishStub);
            sinon.assert.calledWith(
              eventsPublishStub,
              events.SONG_CONSOLIDATED,
              {
                deletedIDs: [oldID],
                updatedSong: createdSong,
              }
            );
          });
        });
      });

      describe("Edit Song", function () {
        it("Updates a song", async function () {
          let song = await createDefaultSong();
          let expectedProps = defaultProps();
          let updatedSong = await lib.updateSong(song.id, expectedProps);
          assert.equal(updatedSong.title, expectedProps.title);
          assert.equal(updatedSong.artist, expectedProps.artist);
          assert.equal(updatedSong.album, expectedProps.album);
          assert.equal(updatedSong.durationMS, expectedProps.durationMS);
          assert.equal(updatedSong.popularity, expectedProps.popularity);
          assert.equal(
            updatedSong.endOfMessageMS,
            expectedProps.endOfMessageMS
          );
          assert.equal(
            updatedSong.beginningOfOutroMS,
            expectedProps.beginningOfOutroMS
          );
          assert.equal(updatedSong.endOfIntroMS, expectedProps.endOfIntroMS);
          assert.equal(updatedSong.audioUrl, expectedProps.audioUrl);
          assert.equal(updatedSong.isrc, expectedProps.isrc);
          assert.equal(updatedSong.spotifyId, expectedProps.spotifyId);
        });
      });

      describe("initializeSongsForUser", function () {
        let spotifyLibStub, songSeeds, user;

        beforeEach(async function () {
          user = await createUser(db);
          songSeeds = createPlayolaSongSeeds(10);

          // create a song to be found instead of created
          await createDefaultSong(songSeeds[0]);

          spotifyLibStub = sinon
            .stub(spotifyLib, "getUserRelatedSongSeeds")
            .resolves(songSeeds);
        });

        afterEach(function () {
          nock.cleanAll();
        });

        it("initializes songs for a user", async function () {
          var { stationSongs } = await lib.initializeSongsForUser({ user });

          let songs = stationSongs.map((stationSong) => stationSong.song);
          let allSongs = await db.models.Song.findAll({});
          assert.equal(allSongs.length, 10);
          assert.equal(songs.length, 10);
          songSeeds.forEach((seed) => {
            assert.isTrue(songs.map((song) => song.title).includes(seed.title));
            assert.isTrue(
              songs.map((song) => song.artist).includes(seed.artist)
            );
            assert.isTrue(
              songs
                .map((song) => song.durationMS)
                .includes(audioProviderData.durationMS)
            );
            assert.isTrue(
              songs.map((song) => song.artist).includes(seed.artist)
            );
          });
          stationSongs.forEach((stationSong) => {
            assert.equal(stationSong.userId, user.id);
          });
        });

        afterEach(function () {
          spotifyLibStub.restore();
        });
      });
    });
  });
});
