const db = require("../../db");
const SongChooser = require("./songChooser");
const { clearDatabase } = require("../../test/test.helpers");
const {
  createStationSongsWithSongs,
  createUser,
  createSong,
} = require("../../test/testDataGenerator");
const moment = require("moment");
const { assert } = require("chai");

describe("SongChooser", function () {
  var user, stationSongs;

  before(async function () {
    await clearDatabase(db);
  });

  beforeEach(async function () {
    this.timeout(5000);
    user = await createUser(db);
    const result = await createStationSongsWithSongs(db, {
      userId: user.id,
      count: 100,
    });
    stationSongs = result.stationSongs;
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  /*
   * helpers
   */
  async function scheduleArtistsAtAirtime({ artists, airtime }) {
    for (let [i, artist] of artists.entries()) {
      let song = await createSong(db, { artist });
      await db.models.Spin.create({
        audioBlockId: song.id,
        userId: user.id,
        airtime,
        playlistPosition: i + 1,
      });
    }
  }

  async function scheduleSongsAtAirtime({ songs, airtime }) {
    for (let [i, song] of songs.entries()) {
      await db.models.Spin.create({
        audioBlockId: song.id,
        userId: user.id,
        airtime,
        playlistPosition: i + 1,
      });
    }
  }

  describe("stationSongs getter/setter", function () {
    it("sorts stationSongs when set", function () {
      let chooser = new SongChooser({ stationSongs });
      assert.isOk(chooser._stationSongs);
      var popularity = 100;
      for (let i = 0; i < chooser._stationSongs.length; i++) {
        assert.isAtMost(chooser._stationSongs[i].song.popularity, popularity);
        popularity = chooser._stationSongs[i].song.popularity;
      }
    });

    it("sets up underlying id maps", function () {
      let chooser = new SongChooser({ stationSongs });
      assert.isOk(chooser.morePopularIDs);
      assert.isOk(chooser.lessPopularIDs);
      assert.hasAllKeys(
        chooser.morePopularIDs,
        chooser._stationSongs.slice(0, 30).map((ss) => ss.song.id)
      );
      assert.hasAllKeys(
        chooser.lessPopularIDs,
        chooser._stationSongs.slice(30).map((ss) => ss.song.id)
      );
    });

    it("grabs the userId from the stationSongs", function () {
      let chooser = new SongChooser({ stationSongs });
      assert.isOk(chooser.userId);
      assert.equal(chooser.userId, user.id);
    });
  });
});
