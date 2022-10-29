const logger = require("../../logger");

const delay = (t, v) => {
  return new Promise((resolve) => setTimeout(resolve, t, v));
};

class EventStreamGroup {
  constructor(streams) {
    for (let stream of streams) {
      this[stream.name] = stream;
    }
    this.streams = streams;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.streams.length === 0) {
        return reject(
          new Error("EventStreamGroup should not contain 0 streams")
        );
      }

      let promises = [];
      for (let stream of this.streams) {
        promises.push(stream.connect());
      }

      Promise.all(promises)
        .then((connections) => resolve())
        .catch((error) => reject(error));
    });
  }

  connectWithRetry() {
    return this.connect()
      .then(() => {
        logger.log("Connected to Event Stream");
      })
      .catch((err) => {
        logger.log("Error connecting to eventStream.  Retrying after 1 sec");
        logger.log(err);
        return delay(1000).then(this.connectWithRetry.bind(this));
      });
  }
}

module.exports = EventStreamGroup;
