const errors = require("../lib/errors");
const logger = require("../logger");

class APIError {
  static get defaults() {
    return {
      statusCode: 400,
      message: "An unknown error occurred",
    };
  }

  static APIResponseFromPlayolaError(playolaErr, res) {
    let error = new APIError({ message: playolaErr.message });

    // Go ahead and log the underlying error
    logger.error(playolaErr);

    return res.status(error.statusCode).json({ error });
  }

  constructor({ statusCode, message }) {
    this.error = new Error(message);
    this.message = message || APIError.defaults.message;
    this.statusCode = statusCode || statusCodeFromMessage(message);
  }
}

function statusCodeFromMessage(message) {
  switch (message) {
    case errors.USER_NOT_FOUND:
    case errors.SONG_NOT_FOUND:
      return 404;
    default:
      return 400;
  }
}

module.exports = APIError;
