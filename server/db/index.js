const Sequelize = require("sequelize");
const logger = require("../logger");
const dbConfig = require("./config")[process.env.NODE_ENV];
const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logger,
});

const User = require("./models/user.model");
const SpotifyUser = require("./models/spotifyUser.model");
const AudioBlock = require("./models/audioBlock.model");
const StationSong = require("./models/stationSong.model/stationSong.model");
const Spin = require("./models/spin.model");

function minutesAgo(minutes) {
  return new Date(new Date().getTime() - minutes * 60 * 1000);
}

function minutesFromNow(minutes) {
  return minutesAgo(-minutes);
}

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

const VoiceTrack = AudioBlock.scope("voicetracks");
VoiceTrack.create = (attrs) =>
  AudioBlock.create({
    ...{ title: "VoiceTrack", artist: "------" }, // defaults
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

Spin.getPlaylist = async ({ userId, extended = false }) => {
  let untilTime = extended ? minutesFromNow(200) : minutesFromNow(15);
  return await Spin.findAll({
    where: {
      userId,
      airtime: { [Sequelize.Op.between]: [minutesAgo(15), untilTime] },
    },
    order: [["playlistPosition", "ASC"]],
    include: [{ model: AudioBlock }],
  });
};

Spin.getFullPlaylist = async ({ userId }) => {
  return await Spin.findAll({
    where: {
      userId,
    },
    order: [["playlistPosition", "ASC"]],
    include: [{ model: AudioBlock }],
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

Spin.belongsTo(User);
Spin.belongsTo(AudioBlock);
User.hasMany(Spin);

const models = {
  User,
  SpotifyUser,
  AudioBlock,
  Song,
  Commercial,
  VoiceTrack,
  StationSong,
  Spin,
};

module.exports = { sequelize, db: sequelize, models };
