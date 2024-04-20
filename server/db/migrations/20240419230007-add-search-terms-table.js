'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.createTable('searchTerms', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
        },
        text: {
          type: Sequelize.STRING,
          unique: true,
        },
        songId: {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: 'CASCADE',
          references: {
            model: 'songs',
            key: 'id',
            allowNull: true,
          },
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

  async down(queryInterface, Sequelize) {
    return Promise.all([queryInterface.dropTable('searchTerms')]);
  },
};
