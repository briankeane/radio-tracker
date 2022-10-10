'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stationSongs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        autoIncrement: false,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        onDelete: 'CASCADE',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      songId: {
        type: Sequelize.UUID,
        onDelete: 'CASCADE',
        references: {
          model: 'audioBlocks',
          key: 'id',
        },
      },
      endOfIntroMSOverride: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      endOfMessageMSOverride: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      beginningOfOutroMSOverride: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      userAffinity: {
        type: Sequelize.DOUBLE,
        defaultValue: 0.0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stationSongs');
  },
};
