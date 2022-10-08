const Sequelize = require("sequelize");
const logger = require("../logger");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === "test" ? false : logger.log,
});

const models = {};

module.exports = { sequelize, db: sequelize, models };
