let amqp = require("amqplib/callback_api");

class EventStream {
  constructor(name, url) {
    this.name = name;
    this.url = url;
    this.channel = null;
    this.queue = null;
    this.handlers = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      const createChannel = (connection) => {
        this._createChannel(connection)
          .then(() => createQueue())
          .catch((error) => reject(error));
      };

      const createQueue = () => {
        this._createQueue()
          .then(() => resolve())
          .catch((error) => reject(error));
      };

      amqp.connect(this.url, (error, connection) => {
        if (error) {
          reject(error);
        } else {
          createChannel(connection);
        }
      });
    });
  }

  _createChannel(connection) {
    return new Promise((resolve, reject) => {
      connection.createChannel((error, channel) => {
        if (error) {
          return reject(error);
        }
        this.channel = channel;
        return resolve();
      });
    });
  }

  _createQueue() {
    return new Promise((resolve, reject) => {
      this.channel.assertQueue(
        null, // causes amqplib to generate random name for the queue
        { exclusive: true }, // scopes the queue to the connection

        (error, queue) => {
          if (error) {
            return reject(error);
          }
          this.queue = queue;
          return resolve();
        }
      );
    });
  }

  publish(event, data) {
    this.channel.assertExchange(event, "fanout", { durable: false });
    this.channel.publish(event, "", Buffer.from(JSON.stringify(data)));
  }

  subscribe(event, handler) {
    this.handlers[event] = handler;
    this.channel.assertExchange(event, "fanout", { durable: false });
    this.channel.bindQueue(this.queue.queue, event, "");
    this.channel.consume(this.queue.queue, (msg) => {
      this.handlers[msg.fields.exchange](JSON.parse(msg.content));
    });
  }
}

module.exports = EventStream;
