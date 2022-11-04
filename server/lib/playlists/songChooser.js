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
}

module.exports = SongChooser;
