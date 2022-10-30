const { Sequelize, DataTypes, Model } = require("sequelize");
const logger = require("../../logger");
const dbConfig = require("../config")[process.env.NODE_ENV];
const sequelize = new Sequelize(dbConfig.url, {
  ...dbConfig,
  logger,
});
class User extends Model {
  jwtRepr() {
    return {
      id: this.id.toString(),
      displayName: this.displayName,
      email: this.email,
      profileImageUrl: this.profileImageUrl,
      role: this.role,
      spotifyUserId: this.spotifyUserId,
      deepLink: this.deepLink,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      autoIncrement: false,
    },
    displayName: DataTypes.STRING,
    deepLink: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    profileImageUrl: DataTypes.STRING,
    spotifyUserId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "user", "guest"),
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    sequelize,
    modelName: "user",
  }
);

module.exports = User;
