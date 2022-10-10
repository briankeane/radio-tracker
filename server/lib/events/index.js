const EventStream = require("./EventStream");
const EventStreamGroup = require("./EventStreamGroup");

const instance = new EventStreamGroup([
  new EventStream("users", process.env.CLOUDAMQP_URL),
]);

Object.freeze(instance);
module.exports = instance;
