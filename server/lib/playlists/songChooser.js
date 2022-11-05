const db = require("../../db");
const errors = require("../errors");
const { Op } = require("sequelize");
const moment = require("moment");
const logger = require("../../logger");

const ARTIST_MINIMUM_REST_MINUTES = 70;
const SONG_MINIMUM_REST_MINUTES = 180;
const DAY_OFFSET_WINDOW_SIZE_MINTES = 60;
const POPULARITY_LEVELS = {
  HIGH: "high",
  LOW: "low",
};

class SongChooser {
  constructor({ stationSongs }) {
    if (stationSongs.length < 100)
      throw new Error(errors.NOT_ENOUGH_STATION_SONGS);
    this.stationSongs = stationSongs;
  }

  set stationSongs(stationSongs) {
    this._stationSongs = [...stationSongs].sort(
      (a, b) => b.song.popularity - a.song.popularity
    );
    this.userId = this._stationSongs[0].userId;
    this._stationSongsMap = {};
    this.morePopularIDs = {};
    this.lessPopularIDs = {};
    this._stationSongsMap = {};

    const VERY_POPULAR_LIMIT_INDEX = Math.floor(
      0.3 * this._stationSongs.length
    );
    for (let i = 0; i < stationSongs.length; i++) {
      this._stationSongsMap[stationSongs[i].songId] = stationSongs[i];

      if (i < VERY_POPULAR_LIMIT_INDEX) {
        let song = this._stationSongs[i].song;
        this.morePopularIDs[song.id] = true;
        this.popularityLowerBounds = song.popularity;
      } else {
        this.lessPopularIDs[this._stationSongs[i].song.id] = true;
      }
    }
  }

  get stationSongs() {
    return this._stationSongs;
  }

  async getArtistsToRest({ airtimeMoment }) {
    let spins = await db.models.Spin.findAll({
      where: {
        userId: this.userId,
        airtime: {
          [Op.between]: [
            airtimeMoment
              .clone()
              .subtract(ARTIST_MINIMUM_REST_MINUTES, "minutes")
              .toDate(),
            airtimeMoment.toDate(),
          ],
        },
      },
      include: [
        {
          model: db.models.AudioBlock,
          as: "audioBlock",
          where: { type: "song" },
        },
      ],
    });
    return spins.map((spin) => spin.audioBlock.artist);
  }

  async getSongIdsToRest({ airtimeMoment }) {
    let spins = await db.models.Spin.findAll({
      where: {
        userId: this.userId,
        airtime: {
          [Op.between]: [
            airtimeMoment
              .clone()
              .subtract(SONG_MINIMUM_REST_MINUTES, "minutes")
              .toDate(),
            airtimeMoment.toDate(),
          ],
        },
      },
      include: [
        {
          model: db.models.AudioBlock,
          as: "audioBlock",
          where: { type: "song" },
        },
      ],
    });
    return spins.map((spin) => spin.audioBlockId);
  }

  async chooseSong({ airtime }) {
    let airtimeMoment = moment(airtime);
    // get a list of artists that have been played recently
    let artistsToRest = await this.getArtistsToRest({ airtimeMoment });
    let songIdsToRest = await this.getSongIdsToRest({ airtimeMoment });
    let usableStationSongs = await db.models.StationSong.findAll({
      where: {
        userId: this.userId,
        songId: { [Op.notIn]: songIdsToRest },
      },
      order: [[{ model: db.models.Song, as: "song" }, "popularity", "DESC"]],
      include: [
        {
          model: db.models.Song,
          as: "song",
          where: { artist: { [Op.notIn]: artistsToRest } },
        },
      ],
    });

    let usableSongs = usableStationSongs.map((stationSong) => stationSong.song);

    if (!usableSongs.length) {
      logger.log(`No usable stationSongs for userId: ${this.userId}`);
      return randomElement(this.stationSongs).song;
    }

    let preferredPopularityLevel = await this.preferredPopularityLevel();
    var highPopularity = [];
    var lowPopularity = [];
    for (let i = 0; i < usableSongs.length; i++) {
      if (usableSongs[i].popularity >= this.popularityLowerBounds) {
        highPopularity.push(usableSongs[i]);
      } else {
        lowPopularity.push(usableSongs[i]);
      }
    }
    if (
      preferredPopularityLevel === POPULARITY_LEVELS.HIGH &&
      highPopularity.length
    ) {
      return randomElement(highPopularity);
    } else if (lowPopularity.length) {
      return randomElement(lowPopularity);
    } else {
      return randomElement(usableSongs);
    }
  }

  /*
   * If the last 4 songs have been popular, try something
   * less popular.  Otherwise stick with popular
   */
  async preferredPopularityLevel() {
    let lastSeveralSpins = await db.models.Spin.findAll({
      where: { userId: this.userId },
      order: [["playlistPosition", "DESC"]],
      include: [{ model: db.models.AudioBlock, where: { type: "song" } }],
      limit: 4,
    });

    for (let spin of lastSeveralSpins) {
      if (spin.audioBlock.popularity < this.popularityLowerBounds) {
        return POPULARITY_LEVELS.HIGH;
      }
      return POPULARITY_LEVELS.LOW;
    }
  }
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = SongChooser;
