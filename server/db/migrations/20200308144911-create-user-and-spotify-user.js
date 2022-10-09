"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.createTable("spotifyUsers", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        spotifyUserId: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false,
        },
        accessToken: {
          type: Sequelize.STRING(512),
        },
        refreshToken: {
          type: Sequelize.STRING(512),
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }),
      queryInterface.createTable("users", {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
        },
        displayName: {
          type: Sequelize.STRING,
        },
        deepLink: {
          type: Sequelize.STRING,
        },
        email: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false,
        },
        profileImageUrl: {
          type: Sequelize.STRING,
        },
        role: {
          type: Sequelize.ENUM("admin", "user", "guest"),
          allowNull: false,
          defaultValue: "user",
        },
        spotifyUserId: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }),
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.dropTable("spotifyUsers"),
      queryInterface.dropTable("users"),
    ]);
  },
};
