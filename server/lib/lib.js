const db = require("../db");
const eventStream = require("./events");
const spotifyLib = require("./spotify/spotify.lib");
const events = require("./events/events");
const errors = require("./errors");
const { Op } = require("sequelize");

const createUserViaSpotifyRefreshToken = async function ({ refreshToken }) {
  function finish(user, created) {
    if (created) eventStream.users.publish(events.USER_CREATED, { user });
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

const getUser = function ({ userId }) {
  return new Promise((resolve, reject) => {
    db.models.User.findByPk(userId)
      .then((user) => {
        if (!user) throw new Error(errors.USER_NOT_FOUND);
        return resolve(user);
      })
      .catch((err) => reject(err));
  });
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
};
