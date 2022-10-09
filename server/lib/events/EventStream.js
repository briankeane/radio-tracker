// let amqp = require("amqplib/callback_api");
const logger = require("../../logger");

class EventStream {
  constructor(name, url) {
    this.name = name;
    this.url = url;
  }

  // ToDo: Implement this stub
  connect() {
    logger.log("stub of eventStream connect()");
    return Promise.resolve();
  }

  connectWithRetry(callback) {
    return new Promise((resolve, reject) => {
      this._retryCallback = callback;
      this.connect()
        .then(() => {
          if (this._retryCallback) {
            this._retryCallback();
          }
          resolve();
        })
        .catch((err) => {
          logger.log("Error connecting to eventStream.  Retrying after 1 sec");
          logger.log(err);
          setTimeout(this.connectWithRetry, 1000);
        });
    });
  }
  subscribe(event, handler) {
    logger.log("subscribe stub");
  }
  publish(event, data) {
    logger.log("publish stub");
  }
}

module.exports = EventStream;
