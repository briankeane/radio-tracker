const { USER_CREATED } = require("./events");
const eventStream = require("./index.js");
const logger = require("../../logger");
const db = require("../../db");
const lib = require("../lib");
const playlistGenerator = require("../playlists/playlistGenerator");

/*
 * When a user is created, created their songs and StationSongs
 */
const onUserCreated = ({ user }) => {
  logger.log("worker responding to USER_CREATED");
  db.models.User.findByPk(user.id)
    .then((foundUser) => lib.initializeSongsForUser({ user: foundUser }))
    .then(({ user }) => playlistGenerator.generatePlaylist({ userId: user.id }))
    .catch((err) => logger.error(err));
};

/*
 * Api
 */
const subscribe = () => {
  eventStream.allEvents.subscribe(USER_CREATED, onUserCreated);
};

module.exports = {
  subscribe,
};
