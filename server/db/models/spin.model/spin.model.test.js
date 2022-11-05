const { assert } = require("chai");
const db = require("../..");
const { clearDatabase } = require("../../../test/test.helpers");
const { createUser, createSong } = require("../../../test/testDataGenerator");
const moment = require("moment");

describe("Spin Model", function () {
  var user, songs, spins;

  before(async function () {
    await clearDatabase(db);
  });

  beforeEach(async function () {
    user = await createUser(db);
    songs = [];
    spins = [];
    var airtime = moment();
    for (let i = 0; i < 10; i++) {
      songs.push(await createSong(db));
      spins.push(
        await db.models.Spin.create({
          userId: user.id,
          audioBlockId: songs[i].id,
          airtime,
          playlistPosition: 10 - i, // playlistPostions count down
        })
      );
      airtime = airtime.add(1, "minutes");
    }
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  it("finds the current playlist", async function () {
    let foundPlaylist = await db.models.Spin.getPlaylist({
      userId: user.id,
    });

    assert.equal(foundPlaylist.length, spins.length);
    // populated correctly
    assert.isOk(foundPlaylist[0].audioBlock.title);

    // in order
    let spinIdsInOrder = spins
      .sort((a, b) => a.playlistPosition - b.playlistPosition)
      .map((spin) => spin.id);
    assert.deepEqual(
      spinIdsInOrder,
      foundPlaylist.map((spin) => spin.id)
    );
  });
});
