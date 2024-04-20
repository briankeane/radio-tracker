'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.createTable('spins', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
        },
        searchTermId: {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: 'CASCADE',
          references: {
            model: 'searchTerms',
            key: 'id',
          },
        },
        stationId: {
          type: Sequelize.UUID,
          onDelete: 'CASCADE',
          references: {
            model: 'stations',
            key: 'id',
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
      queryInterface.createTable('pollResults', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          autoIncrement: false,
        },
        searchTermId: {
          type: Sequelize.UUID,
          allowNull: true,
          onDelete: 'CASCADE',
          references: {
            model: 'searchTerms',
            key: 'id',
          },
        },
        stationId: {
          type: Sequelize.UUID,
          onDelete: 'CASCADE',
          references: {
            model: 'stations',
            key: 'id',
          },
        },
        errorMessage: {
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

  async down(queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.dropTable('spins'),
      queryInterface.dropTable('pollResults'),
    ]);
  },
};
