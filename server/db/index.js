import Sequelize from "sequelize";
import logger from "../logger";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === "test" ? false : logger.log,
});

const models = {};

export { sequelize, sequelize as db, models };
