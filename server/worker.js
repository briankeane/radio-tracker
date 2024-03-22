const eventStream = require('./lib/events');
const eventHandlers = require('./lib/events/handlers');
const logger = require('./logger');
const cron = require('node-cron');
const db = require('./db');
const playlistGenerator = require('./lib/playlists/playlistGenerator');
const { Op } = require('sequelize');

eventStream.connectWithRetry().then(() => {
  logger.log('Subsscribing');
  eventHandlers.subscribe();
  logger.log('Worker Started');
});

async function updateAllPlaylists() {
  logger.log('WORKER updating playlists');
  let allUsersRaw = await db.models.User.findAll(
    {},
    { attributes: ['id'], raw: true }
  );
  let promises = [];
  for (let user of allUsersRaw) {
    promises.push(playlistGenerator.generatePlaylist({ userId: user.id }));
  }
  await Promise.allSettled(promises);
  logger.log('Playlist Updates Complete');
}

async function deleteOldSpins() {
  logger.log('WORKER removing old spins');
  await db.models.Spin.destroy({
    where: {
      createdAt: {
        [Op.lte]: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    },
  });
}

cron.schedule('*/15 * * * *', async () => {
  await updateAllPlaylists();
  await deleteOldSpins();
});

// Erase everything before midnight this morning
cron.schedule('0 0 20 * * *', async () => {
  await db.models.Spin.destroy({
    where: {
      createdAt: { [Op.lte]: new Date().setUTCHours(0, 0, 0, 0) },
    },
  });
});

// run once when it starts
updateAllPlaylists();
deleteOldSpins();
