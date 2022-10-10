const logger = require("../../logger");

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

  connectWithRetry(callback) {
    return new Promise((resolve, reject) => {
      this.connect()
        .then(() => {
          if (callback) {
            callback();
          }
          return resolve();
        })
        .catch((err) => {
          logger.log("Error connecting to eventStream.  Retrying after 1 sec");
          logger.log(err);
          setTimeout(() => {
            this.connectWithRetry(callback);
          }, 1000);
        });
    });
  }
}

module.exports = EventStreamGroup;
