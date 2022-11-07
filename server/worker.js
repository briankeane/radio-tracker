const eventStream = require("./lib/events");
const eventHandlers = require("./lib/events/handlers");
const logger = require("./logger");
const cron = require("node-cron");
const db = require("./db");
const playlistGenerator = require("./lib/playlists/playlistGenerator");

eventStream.connectWithRetry().then(() => {
  logger.log("Subsscribing");
  eventHandlers.subscribe();
  logger.log("Worker Started");
});

cron.schedule("*/15 * * * *", async () => {
  logger.log("WORKER updating playlists");
  let allUsersRaw = await db.models.User.findAll(
    {},
    { attributes: ["id"], raw: true }
  );
  let promises = [];
  for (let user of allUsersRaw) {
    console.log("here");
    promises.push(playlistGenerator.generatePlaylist({ userId: user.id }));
  }
  await Promise.allSettled(promises);
  logger.log("Playlist Updates Complete");
});
