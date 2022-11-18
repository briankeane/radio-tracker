const { assert } = require("chai");
const db = require("../..");
const { clearDatabase } = require("../../../test/test.helpers");
const {
  createUser,
  createStationSongsWithSongs,
} = require("../../../test/testDataGenerator");

describe("StationSong Model", function () {
  var user, stationSongs, songs;

  before(async function () {
    await clearDatabase(db);
  });

  beforeEach(async function () {
    user = await createUser(db);
    const result = await createStationSongsWithSongs(db, {
      userId: user.id,
      count: 10,
    });
    stationSongs = result.stationSongs;
    songs = result.songs;
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  it("finds active stationSongs", async function () {
    let foundStationSongs = await db.models.StationSong.findAllActive({
      userId: user.id,
    });
    assert.equal(foundStationSongs.length, stationSongs.length);
  });
});
