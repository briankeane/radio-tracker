const Sequelize = require("sequelize");
const logger = require("../logger");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === "test" ? false : logger.log,
});

const User = require("./models/user.model");
const SpotifyUser = require("./models/spotifyUser.model");

const models = {
  User,
  SpotifyUser,
};

module.exports = { sequelize, db: sequelize, models };
