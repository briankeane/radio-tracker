'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audioBlocks', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        autoIncrement: false,
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM,
        values: ['song', 'commercial', 'voicetrack'],
      },
      title: {
        type: Sequelize.STRING,
      },
      artist: {
        type: Sequelize.STRING,
      },
      album: {
        type: Sequelize.STRING,
      },
      durationMS: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      popularity: Sequelize.INTEGER,
      youTubeId: Sequelize.STRING,
      endOfMessageMS: Sequelize.INTEGER,
      endOfIntroMS: Sequelize.INTEGER,
      beginningOfOutroMS: Sequelize.INTEGER,
      audioIsVerified: Sequelize.BOOLEAN,
      audioUrl: Sequelize.STRING,
      isrc: {
        type: Sequelize.STRING,
        unique: true,
      },
      spotifyId: {
        type: Sequelize.STRING,
        unique: true,
      },
      imageUrl: Sequelize.STRING,
      audioGetterId: Sequelize.STRING,
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
    await queryInterface.dropTable('audioBlocks');
  },
};
