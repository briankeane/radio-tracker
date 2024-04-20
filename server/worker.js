const eventStream = require('./lib/events');
const eventHandlers = require('./lib/events/handlers');
const logger = require('./logger');
const cron = require('node-cron');
const db = require('./db');
const { Op } = require('sequelize');

eventStream.connectWithRetry().then(() => {
  logger.log('Subsscribing');
  eventHandlers.subscribe();
  logger.log('Worker Started');
});

// cron.schedule('*/15 * * * *', async () => {
//   await updateAllPlaylists();
//   await deleteOldSpins();
// });

// // Erase everything before midnight this morning
// cron.schedule('0 0 20 * * *', async () => {
//   await db.models.Spin.destroy({
//     where: {
//       createdAt: { [Op.lte]: new Date().setUTCHours(0, 0, 0, 0) },
//     },
//   });
// });

// run once when it starts
// updateAllPlaylists();
// deleteOldSpins();
