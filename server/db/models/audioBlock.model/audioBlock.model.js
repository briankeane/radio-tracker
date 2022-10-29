"use strict";
const { Sequelize, DataTypes } = require("sequelize");
const logger = require("../../../logger");
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: logger.log,
});

const AudioBlock = sequelize.define(
  "audioBlock",
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
    type: {
      type: DataTypes.ENUM,
      values: ["song", "commercial", "voicetrack"],
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    artist: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    album: DataTypes.STRING,
    durationMS: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    popularity: DataTypes.INTEGER,
    youTubeId: DataTypes.STRING,
    endOfMessageMS: DataTypes.INTEGER,
    endOfIntroMS: DataTypes.INTEGER,
    beginningOfOutroMS: DataTypes.INTEGER,
    audioIsVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    audioUrl: DataTypes.STRING,
    audioGetterId: DataTypes.STRING,
    isrc: {
      type: DataTypes.STRING,
      unique: true,
    },
    spotifyId: {
      type: DataTypes.STRING,
      unique: true,
    },
    imageUrl: DataTypes.STRING,
  },
  {
    getterMethods: {
      endOfMessageMS: function () {
        let calculatedValue =
          this.getDataValue("endOfMessageMS") ||
          this.getDataValue("durationMS") - 1000;
        if (calculatedValue <= 0) return this.getDataValue("durationMS");
        return calculatedValue;
      },
      beginningOfOutroMS: function () {
        return this.getDataValue("beginningOfOutroMS") || this.endOfMessageMS;
      },
      endOfIntroMS: function () {
        let setValue = this.getDataValue("endOfIntroMS");
        if (setValue) return setValue;
        return this.durationMS > 1000 ? 1000 : this.durationMS;
      },
    },
    scopes: {
      songs: {
        where: { type: "song" },
      },
      commercials: {
        where: { type: "commercial" },
      },
      voicetracks: {
        where: { type: "voicetrack" },
      },
    },
  }
);

module.exports = AudioBlock;
