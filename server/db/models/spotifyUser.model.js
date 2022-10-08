const { Sequelize, DataTypes, Model } = require("sequelize");
const logger = require("../../logger");
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: logger.log,
});

class SpotifyUser extends Model {}

SpotifyUser.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      autoIncrement: false,
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    spotifyUserId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    accessToken: DataTypes.STRING,
    refreshToken: DataTypes.STRING(512),
  },
  {
    sequelize,
    modelName: "spotifyUser",
  }
);

module.exports = SpotifyUser;
