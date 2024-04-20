'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.createTable('songs', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        itunesTrackId: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        artist: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        album: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        itunesTrackViewUrl: {
          allowNull: true,
          type: Sequelize.STRING,
        },
        artworkUrl: {
          allowNull: true,
          type: Sequelize.STRING,
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
      queryInterface.createTable('stations', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
        },
        name: {
          type: Sequelize.STRING,
        },
        streamUrl: {
          type: Sequelize.STRING,
        },
        streamSource: {
          type: Sequelize.STRING,
          allowNull: true,
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
      queryInterface.dropTable('songs'),
      queryInterface.dropTable('stations'),
    ]);
  },
};
