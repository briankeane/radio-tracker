const { assert } = require("chai");
const db = require("../..");
const { clearDatabase } = require("../../../test/test.helpers");

describe("Song Model", function () {
  var song;

  before(async function () {
    await clearDatabase(db);
  });

  beforeEach(async function () {
    song = await db.models.Song.create({
      artist: "Rachel Loy",
      title: "Stepladder",
      durationMS: 6000,
    });
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  describe("endOfMessageMS", function () {
    it("provides a default of duration minus 1 sec", function () {
      assert.equal(song.endOfMessageMS, 5000);
    });

    it("does not allow less than zero (provides durationMS instead)", async function () {
      song.durationMS = 500;
      await song.save();
      assert.equal(song.endOfMessageMS, song.durationMS);
    });

    it("provides real value if it has been set", async function () {
      song.endOfMessageMS = 1234;
      await song.save();
      assert.equal(song.endOfMessageMS, 1234);
    });
  });

  describe("beginningOfOutro", function () {
    it("defaults to endOfMessageMS", async function () {
      assert.equal(song.beginningOfOutroMS, song.endOfMessageMS);
      song.endOfMessageMS = 1234;
      await song.save();
      assert.equal(song.beginningOfOutroMS, song.endOfMessageMS);
    });

    it("provides real value if it has been set", async function () {
      song.beginningOfOutroMS = 2345;
      await song.save();
      assert.equal(song.beginningOfOutroMS, 2345);
    });
  });

  describe("endOfIntroMS", function () {
    it("defaults to 1 sec", function () {
      assert.equal(song.endOfIntroMS, 1000);
    });

    it("does not let default go longer than duration", async function () {
      song.durationMS = 750;
      await song.save();
      assert.equal(song.endOfIntroMS, song.durationMS);
    });

    it("returns a set value if it exists", async function () {
      song.endOfIntroMS = 3456;
      await song.save();
      assert.equal(song.endOfIntroMS, 3456);
    });
  });
});
