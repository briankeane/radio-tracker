const db = require("../db");
const eventStream = require("./events");
const spotifyLib = require("./spotify/spotify.lib");
const events = require("./events/events");
const errors = require("./errors");
const playlistGenerator = require("./playlists/playlistGenerator");
const { Op, UniqueConstraintError } = require("sequelize");
const audioProvider = require("./audioProvider");
const AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3({ signatureVersion: "v4" });
const moment = require("moment");

const crypto = require("crypto");
const { max } = require("../db/models/audioBlock.model");
const logger = require("../logger");

const NUMBER_OF_SONGS_TO_REQUEST = 200;

/*
 * Users
 */
const createUserViaSpotifyRefreshToken = async function ({ refreshToken }) {
  function finish(user, created) {
    if (created) eventStream.allEvents.publish(events.USER_CREATED, { user });
    return user;
  }

  let profile = await spotifyLib.getPlayolaUserSeed({ refreshToken });
  const [user, created] = await db.models.User.findOrCreate({
    where: { spotifyUserId: profile.spotifyUserId },
    defaults: {
      ...cleanUserSeed(profile),
    },
  });
  return finish(user, created);
};

const getUser = async function ({ userId, extendedPlaylist = false }) {
  let user = await db.models.User.findByPk(userId);
  if (!user) throw new Error(errors.USER_NOT_FOUND);
  let playlist = await db.models.Spin.getPlaylist({
    userId,
    extended: extendedPlaylist,
  });
  if (playlist.length) {
    user.setDataValue("playlist", playlist);
  }
  return user;
};

const deleteSpin = async function ({ spinId, userId }) {
  await playlistGenerator.deleteSpin({ spinId });
  return await getUser({ userId, extendedPlaylist: true });
};

const insertSpin = async function ({ userId, audioBlockId, playlistPosition }) {
  await playlistGenerator.insertSpin({
    userId,
    audioBlockId,
    playlistPosition,
  });
  return await getUser({ userId, extendedPlaylist: true });
};

const moveSpin = async function ({ userId, spinId, newPlaylistPosition }) {
  await playlistGenerator.moveSpin({ spinId, newPlaylistPosition });
  return await getUser({ userId, extendedPlaylist: true });
};

const getUsersStationSongs = async function ({ userId }) {
  let stationSongs = await db.models.StationSong.findAll({
    where: { userId: userId },
    include: [
      {
        model: db.models.Song,
        as: "song",
        where: { audioUrl: { [Op.ne]: null } },
      },
    ],
  });

  // if no songs were returned, make sure the user exists
  if (!stationSongs.length) {
    let user = await db.models.User.findByPk(userId);
    if (!user) throw new Error(errors.USER_NOT_FOUND);
  }
  return stationSongs;
};

/*
 * Songs
 */
async function createSongViaSpotifyId({ spotifyId, spotifyUserId }) {
  let song = await db.models.Song.findOne({ where: { spotifyId } });
  if (song) return song;
  let songSeed = await spotifyLib.getSongSeedFromSpotifyId({
    spotifyUserId,
    spotifyId,
  });
  song = await createSong(songSeed);
  return song;
}

function updateSong(songId, attrs) {
  return new Promise((resolve, reject) => {
    function finish(song) {
      eventStream.allEvents.publish(events.SONG_UPDATED, { song });
      return resolve(song);
    }
    db.models.Song.findByPk(songId)
      .then((oldSong) => oldSong.update(attrs))
      .then((updatedSong) => finish(updatedSong))
      .catch((err) => reject(err));
  });
}

function createSong(attrs) {
  return new Promise((resolve, reject) => {
    function finish([song, created]) {
      if (created) eventStream.allEvents.publish(events.SONG_CREATED, { song });
      return resolve(song);
    }

    var songData = {};

    const where = {
      [Op.or]: [{ spotifyId: attrs.spotifyId }, { isrc: attrs.isrc }],
    };

    audioProvider
      .getDataForSong(attrs)
      .then((foundSongData) => {
        songData = foundSongData;
        return db.models.AudioBlock.findOrCreate({
          where,
          defaults: { ...attrs, ...songData, ...{ type: "song" } },
        });
      })
      .then(async ([song, created]) => [
        await song.update({ ...attrs, ...songData }),
        created,
      ])
      .then((result) => finish(result))
      .catch(async (err) => {
        if (err instanceof UniqueConstraintError) {
          try {
            let consolidatedSong = await consolidateSongs({
              where,
              newSongAttrs: attrs,
            });
            return finish([consolidatedSong, false]);
          } catch (newErr) {
            logger.error("consolidation error!");
            logger.error("err: ", err);
            logger.error("newErr: ", newErr);
            throw err;
          }
        }
        throw err;
      })
      .catch((err) => reject(err));
  });
}

async function findOrCreateSongsForUser({ spotifyUserId }) {
  var songSeeds = await spotifyLib.getUserRelatedSongSeeds({ spotifyUserId });

  // just use the songs the user likes most
  songSeeds = songSeeds
    .sort((a, b) => b.userAffinity - a.userAffinity)
    .slice(0, NUMBER_OF_SONGS_TO_REQUEST);
  return await Promise.all(
    songSeeds.map(async (seed) => ({
      song: await createSong(seed),
      userAffinity: seed.userAffinity,
    }))
  );
}

async function initializeSongsForUser({ user }) {
  let createdSongDatas = await findOrCreateSongsForUser({
    spotifyUserId: user.spotifyUserId,
  });
  let stationSongs = [];
  for (let songData of createdSongDatas) {
    stationSongs.push(
      await db.models.StationSong.create({
        userId: user.id,
        songId: songData.song.id,
        userAffinity: songData.userAffinity,
      })
    );
  }
  // `include` does not work on `create()`, so we've got to go get 'em afterwards
  const retrievedStationSongs = await db.models.StationSong.findAll({
    where: { userId: user.id },
    include: [{ model: db.models.User }, { model: db.models.Song, as: "song" }],
  });

  return { stationSongs: retrievedStationSongs, user };
}

function createPresignedUploadUrl({ userId }) {
  const dateStr = moment().format("DD-MM-YYYY-h-mm-ss");
  const filename = `${userId}--${dateStr}.m4a`;

  const presignedUrl = s3.getSignedUrl("putObject", {
    Bucket: process.env.VOICETRACKS_BUCKET,
    Key: filename,
    Expires: 60 * 5,
  });
  return { presignedUrl, filename };
}

async function createVoiceTrack({ filename, durationMS }) {
  return await db.models.VoiceTrack.create({
    durationMS,
    endOfMessageMS: Math.min(durationMS - 1000, durationMS),
    audioUrl: `https://${process.env.VOICETRACKS_BUCKET}.s3.amazonaws.com/${filename}`,
  });
}

/*
 * Helper methods
 */

async function consolidateSongs({ where, newSongAttrs }) {
  let songs = await db.models.Song.findAll({ where });
  let firstSong = songs.shift();
  let combinedOtherSongInfos = Object.assign(
    {},
    songs.map((song) => song.toJSON())
  );
  const deletedIDs = songs.map((song) => song.id);
  songs.forEach(async (song) => await song.destroy());
  await firstSong.update({
    ...combinedOtherSongInfos,
    ...newSongAttrs,
  });
  eventStream.allEvents.publish(events.SONG_CONSOLIDATED, {
    deletedIDs,
    updatedSong: firstSong,
  });
  return firstSong;
}

function cleanUserSeed(seed) {
  return {
    displayName: seed.displayName,
    email: seed.email,
    profileImageUrl: seed.profileImageUrl,
  };
}

module.exports = {
  createUserViaSpotifyRefreshToken,
  getUsersStationSongs,
  getUser,
  moveSpin,
  deleteSpin,
  insertSpin,
  createSong,
  updateSong,
  initializeSongsForUser,
  createSongViaSpotifyId,
  createPresignedUploadUrl,
  createVoiceTrack,
};
