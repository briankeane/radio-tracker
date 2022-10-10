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

  subscribe(event, handler) {
    logger.log("subscribe stub");
  }
  publish(event, data) {
    logger.log("publish stub");
  }
}

module.exports = EventStream;
