const eventStream = require("./lib/events");
const eventHandlers = require("./lib/events/handlers");
const logger = require("./logger");

eventStream.connectWithRetry().then(() => {
  logger.log("Subsscribing");
  eventHandlers.subscribe();
  logger.log("Worker Started");
});
// .catch((err) => logger.log(`Services event stream error: ${err}`));
