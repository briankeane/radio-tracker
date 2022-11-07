const chai = require("chai");
chai.use(require("chai-moment"));
const { assert } = chai;
const sinon = require("sinon");
const db = require("../../db");
const errors = require("../errors");
const tk = require("timekeeper");
const {
  createUser,
  createStationSongsWithSongs,
  createCommercial,
  createVoicetrack,
  createSong,
} = require("../../test/testDataGenerator");
const { clearDatabase } = require("../../test/test.helpers");
const generator = require("./playlistGenerator");
const moment = require("moment");
const SongChooser = require("./songChooser");
const CommercialChooser = require("./commercialChooser");

var timeFormat = "h:mm:ssa YYYY-MM-D";
moment.defaultFormat = timeFormat;
moment.createFromInputFallback = function (config) {
  config._d = new Date(config._i);
};

describe("Playlist Scheduling", function () {
  var user, song, commercial, playlist;

  before(async function () {
    await clearDatabase(db);
    user = await createUser(db);
    await createStationSongsWithSongs(db, {
      userId: user.id,
      count: 100,
    });
    tk.freeze(new Date(2015, 3, 15, 13, 1));
    song = await createSong(db, {
      durationMS: 182000,
      endOfIntroMS: 5000,
      beginningOfOutroMS: 170000,
      endOfMessageMS: 180000,
    });
    commercial = await createCommercial(db, {
      durationMS: 120000,
      endOfMessageMS: 120000,
    });

    sinon.stub(SongChooser.prototype, "chooseSong").resolves(song);
    sinon
      .stub(CommercialChooser.prototype, "chooseCommercial")
      .resolves(commercial);
    playlist = await generator.generatePlaylist({ userId: user.id });
  });

  after(async function () {
    tk.reset();
    SongChooser.prototype.chooseSong.restore();
    CommercialChooser.prototype.chooseCommercial.restore();
    await clearDatabase(db);
  });

  describe("scheduling", function () {
    it("errors if there are not enough StationSongs", async function () {
      const userWithNoStationSongs = await createUser(db);
      try {
        await generator.generatePlaylist({
          userId: userWithNoStationSongs.id,
        });
      } catch (err) {
        assert.equal(err.message, errors.NOT_ENOUGH_STATION_SONGS);
      }
    });

    describe("generatePlaylist", function () {
      it("starts 10 secs ago", async function () {
        assert.deepEqual(playlist[0].airtime, new Date(2015, 3, 15, 13, 0, 50));
      });

      it("Puts commercial blocks within 1 spin length of airtime block change", function () {
        var commercialCount = 0;
        for (let spin of playlist) {
          if (spin.audioBlock.type === "commercial") {
            commercialCount++;
            var secondsDifference = moment(spin.airtime).diff(
              moment(spin.airtime).startOf("hour"),
              "seconds"
            );
            // account for half hours, too
            if (secondsDifference > 30 * 60) {
              secondsDifference = secondsDifference - 30 * 60;
            }

            assert.isBelow(secondsDifference, 3 * 60);
          }
        }
        assert.equal(commercialCount, 8);
      });
    });
  });

  describe("get airtime block", function () {
    it("gets a different airtime block for each 30 min", function () {
      var baseTime = moment("3:00:00am 2015-04-15", timeFormat);
      var baseBlock = generator.getAirtimeBlock(baseTime);
      assert.equal(
        generator.getAirtimeBlock(moment("3:20:00am 2015-04-15", timeFormat)),
        baseBlock
      );
      assert.equal(
        generator.getAirtimeBlock(moment("3:31:00am 2015-04-15", timeFormat)),
        baseBlock + 1
      );
      assert.equal(
        generator.getAirtimeBlock(moment("4:01:00am 2015-04-15", timeFormat)),
        baseBlock + 2
      );
    });
  });

  describe("TODO: Add tests for reformatSchedule, moveSpin", function () {
    it.skip("Leaving this as a reminder to write these tests in the future", function () {
      assert.isTrue(true);
    });
  });

  describe("airtimeForSpin", function () {
    var user, songs, spinData, currentPlaylist;
    var commercial1, commercial2, voicetrack1, voicetrack2;

    beforeEach(async function () {
      user = await createUser(db);
      const result = await createStationSongsWithSongs(db, {
        userId: user.id,
        count: 10,
      });
      songs = result.songs;
      spinData = {
        audioBlock: songs[0],
        userId: user.id,
      };
      currentPlaylist = [];
      var placeKeeperMoment = moment(new Date(2015, 3, 15, 13, 0));
      for (let i = 0; i < 10; i++) {
        currentPlaylist.push(
          await db.models.Spin.create({
            playlistPosition: i + 1,
            audioBlockId: songs[i].id,
            airtime: placeKeeperMoment.add(3, "minutes"),
            userId: user.id,
          })
        );
        await currentPlaylist[currentPlaylist.length - 1].reload({
          include: [db.models.AudioBlock],
        });
        commercial1 = await createCommercial(db, { durationMS: 30000 });
        commercial2 = await createCommercial(db, { durationMS: 30000 });
        voicetrack1 = await createVoicetrack(db, { durationMS: 40000 });
        voicetrack2 = await createVoicetrack(db, { durationMS: 40000 });
      }
    });
    it("starts 10 secs ago if there are no previous spins", function () {
      const airtime = generator.airtimeForSpin({
        currentPlaylist: [],
        spinData,
      });
      assert.isTrue(moment().subtract(10, "seconds").isSame(airtime));
    });

    describe("Non-Voicetracks (eom of the previous spin)", function () {
      it("song | song", function () {
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[9].airtime).add(
            songs[9].endOfMessageMS,
            "milliseconds"
          )
        );
      });

      it("song | commercial", function () {
        spinData.audioBlock = commercial1;
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[9].airtime).add(
            songs[9].endOfMessageMS,
            "milliseconds"
          )
        );
      });

      it("commercial | song", function () {
        currentPlaylist[currentPlaylist.length - 1].audioBlock = commercial1;
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[9].airtime).add(
            commercial1.endOfMessageMS,
            "milliseconds"
          )
        );
      });

      it("commercial | commercial", function () {
        currentPlaylist[currentPlaylist.length - 1].audioBlock = commercial1;
        spinData.audioBlock = commercial2;
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[currentPlaylist.length - 1].airtime).add(
            commercial1.endOfMessageMS,
            "milliseconds"
          )
        );
      });

      it("commercial | voicetrack", function () {
        currentPlaylist[currentPlaylist.length - 1].audioBlock = commercial1;
        spinData.audioBlock = voicetrack1;
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[currentPlaylist.length - 1].airtime).add(
            commercial1.endOfMessageMS,
            "milliseconds"
          )
        );
      });

      it("voicetrack | voicetrack", function () {
        currentPlaylist[currentPlaylist.length - 1].audioBlock = voicetrack1;
        spinData.audioBlock = voicetrack2;
        const airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(currentPlaylist[currentPlaylist.length - 1].airtime).add(
            voicetrack1.endOfMessageMS,
            "ms"
          )
        );
      });
    });

    describe("Song | Voicetrack", function () {
      it("voicetrack is longer than outro -- schedule at beginning of outro", function () {
        let previousSpin = currentPlaylist[currentPlaylist.length - 1];
        previousSpin.audioBlock.durationMS = 180000;
        previousSpin.audioBlock.beginningOfOutroMS = 170000;
        previousSpin.audioBlock.endOfMessageMS = 178000;
        spinData.audioBlock = voicetrack1;
        voicetrack1.durationMS = 20000;
        let airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(previousSpin.airtime).add(
            previousSpin.audioBlock.beginningOfOutroMS,
            "milliseconds"
          )
        );
      });

      it("voicetrack is shorter than outro -- cover half of the voicetrack", function () {
        let previousSpin = currentPlaylist[currentPlaylist.length - 1];
        previousSpin.audioBlock.durationMS = 180000;
        previousSpin.audioBlock.beginningOfOutroMS = 170000;
        previousSpin.audioBlock.endOfMessageMS = 178000;
        spinData.audioBlock = voicetrack1;
        voicetrack1.durationMS = 6001;
        let airtime = generator.airtimeForSpin({ currentPlaylist, spinData });
        assert.sameMoment(
          airtime,
          moment(previousSpin.airtime).add(
            spinData.audioBlock.durationMS / 2,
            "milliseconds"
          )
        );
      });
    });

    describe("Song | Voicetrack | Song", function () {
      var songBeforeVoicetrackSpin, voicetrackSpin, spinData;

      beforeEach(function () {
        songBeforeVoicetrackSpin = {
          airtime: new Date(2021, 3, 15, 2, 58),
          audioBlock: {
            type: "song",
            endOfMessageMS: 180000,
          },
        };

        voicetrackSpin = {
          airtime: new Date(2021, 3, 15, 3),
          audioBlock: {
            type: "voicetrack",
            endOfMessageMS: 120000,
          },
        };
        spinData = {
          audioBlock: {
            type: "song",
            endOfIntroMS: 90000,
          },
        };
      });
      /*
       *             previous spin
       *   |---------------------|-------------|
       * airtime                boo = 2min    eom = 3min
       *  2:58am               3:00am        3:01am         3:02am
       *                                   voicetrack eom = 2min
       *                          |-----------------------------|
       *                        airtime                        eom
       *
       *                                                    next song
       *                                        |---------------|------------------------|
       *                                        ^       eoi = 90 secs
       *                                        |
       *                                     airtime = 3:01am
       */
      it("butts songs together when time left in voicetrack is shorter than song intro", function () {
        songBeforeVoicetrackSpin.airtime = new Date(2021, 3, 15, 2, 58);
        songBeforeVoicetrackSpin.audioBlock.beginningOfOutroMS = 120000;
        songBeforeVoicetrackSpin.audioBlock.endOfMessageMS = 180000;
        voicetrackSpin.airtime = new Date(2021, 3, 15, 3);
        voicetrackSpin.endOfMessageMS = 120000;
        spinData.audioBlock.endOfIntroMS = 90000;
        let airtime = generator.airtimeForSpin({
          currentPlaylist: [songBeforeVoicetrackSpin, voicetrackSpin],
          spinData,
        });
        assert.sameMoment(airtime, moment(new Date(2021, 3, 15, 3, 1)));
      });
      /*
       *             previous spin
       *    |---------------------|-------------|
       * airtime                 boo           eom
       *  2:58am                3:00am        3:01am         3:02am
       *                                   voicetrack eom = 2 min
       *                          |-----------------------------|
       *                        airtime                        eom
       *
       *                                                    next song
       *                                               |--------|------------------------|
       *                                               ^       eoi = 30 secs
       *                                               |
       *                                            airtime = 3:01:30
       */
      it("leaves a proper gap when time left in voicetrack is longer than song intro", function () {
        songBeforeVoicetrackSpin.airtime = new Date(2021, 3, 15, 2, 58);
        songBeforeVoicetrackSpin.audioBlock.beginningOfOutroMS = 120000;
        songBeforeVoicetrackSpin.audioBlock.endOfMessageMS = 180000;
        voicetrackSpin.airtime = new Date(2021, 3, 15, 3);
        voicetrackSpin.endOfMessageMS = 120000;
        spinData.audioBlock.endOfIntroMS = 30000;
        let airtime = generator.airtimeForSpin({
          currentPlaylist: [songBeforeVoicetrackSpin, voicetrackSpin],
          spinData,
        });
        assert.sameMoment(airtime, moment(new Date(2021, 3, 15, 3, 1, 30)));
      });
    });
  });

  describe("msLeftInVoicetrack", function () {
    var previousSpin, voicetrackSpin;

    beforeEach(function () {
      const previousSpinAirtime = moment(
        "3:31:00am 2015-04-15",
        timeFormat
      ).toDate();
      const voiceTrackAirtime = moment(
        "3:34:00am 2015-04-15",
        timeFormat
      ).toDate();
      previousSpin = {
        airtime: previousSpinAirtime,
        audioBlock: { endOfMessageMS: 190000 },
      };
      voicetrackSpin = {
        airtime: voiceTrackAirtime,
        audioBlock: { endOfMessageMS: 20000 },
      };
    });

    it("tells the milliseconds left in a voicetrack", function () {
      let msLeft = generator.msLeftInVoicetrack({
        voicetrackSpin,
        previousSpin,
      });
      assert.equal(msLeft, 10000);
    });

    it("works if previousSpin is undefined", function () {
      let msLeft = generator.msLeftInVoicetrack({ voicetrackSpin });
      assert.equal(msLeft, voicetrackSpin.audioBlock.endOfMessageMS);
    });
  });
});
