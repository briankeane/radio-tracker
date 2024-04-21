const Sequelize = require('sequelize');
const logger = require('../logger');
const dbConfig = require('./config')[process.env.NODE_ENV];
const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logger,
});

const Station = require('./models/station.model');
const Song = require('./models/song.model');
const Spin = require('./models/spin.model');
const SearchTerm = require('./models/searchTerm.model');
const PollResult = require('./models/pollResult.model/pollResult.model');

function minutesAgo(minutes) {
  return new Date(new Date().getTime() - minutes * 60 * 1000);
}

function minutesFromNow(minutes) {
  return minutesAgo(-minutes);
}

/*
 * Relationships
 */
Song.hasMany(SearchTerm);
SearchTerm.belongsTo(Song);

PollResult.belongsTo(SearchTerm);
SearchTerm.hasMany(PollResult);

// PollResult.belongsTo(Song, { through: SearchTerm });
// Song.belongsToMany(PollResult, { through: SearchTerm });

const models = {
  Song,
  Spin,
  Station,
  SearchTerm,
  PollResult,
};

module.exports = { sequelize, db: sequelize, models };
