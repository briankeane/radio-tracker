const Sequelize = require("sequelize");
const logger = require("../logger");
const dbConfig = require("./config")[process.env.NODE_ENV];
console.log("dbConfig.dialectOptions: ", dbConfig.dialectOptions);
dbConfig.dialectOptions.ssl.rejectUnauthorized = false;
const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logger,
});

const User = require("./models/user.model");
const SpotifyUser = require("./models/spotifyUser.model");
const AudioBlock = require("./models/audioBlock.model");
const StationSong = require("./models/stationSong.model/stationSong.model");

/*
 * AudioBlock sub-models
 */
const Song = AudioBlock.scope("songs");
Song.create = (attrs) => AudioBlock.create({ ...attrs, ...{ type: "song" } });

const Commercial = AudioBlock.scope("commercials");
Commercial.create = (attrs) =>
  AudioBlock.create({
    ...{ title: "Commercial", artist: "------" }, // defaults
    ...attrs,
    ...{ type: "commercial" },
  });

const Voicetrack = AudioBlock.scope("voicetracks");
Voicetrack.create = (attrs) =>
  AudioBlock.create({
    ...{ title: "Voicetrack", artist: "------" }, // defaults
    ...attrs,
    ...{ type: "voicetrack" },
  });

StationSong.findAllActive = async ({ userId }) => {
  return await StationSong.findAll({
    where: { userId: userId },
    include: [
      {
        model: Song,
        as: "song",
        where: { audioUrl: { [Sequelize.Op.ne]: null } },
      },
    ],
  });
};

/*
 * Relationships
 */
User.belongsToMany(AudioBlock, { through: StationSong });
AudioBlock.belongsToMany(User, {
  through: StationSong,
  foreignKey: "songId",
  alias: "song",
});
User.hasMany(StationSong, { onDelete: "CASCADE" });
AudioBlock.hasMany(StationSong, {
  onDelete: "CASCADE",
  foreignKey: "songId",
  alias: "song",
});
StationSong.belongsTo(User);
StationSong.belongsTo(AudioBlock, { foreignKey: "songId", as: "song" });

const models = {
  User,
  SpotifyUser,
  AudioBlock,
  Song,
  Commercial,
  Voicetrack,
  StationSong,
};

module.exports = { sequelize, db: sequelize, models };
