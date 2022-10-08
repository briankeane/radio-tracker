/* eslint-disable no-console */
var _suppressOutput = false;

function suppressLogger() {
  _suppressOutput = true;
}

function enableLogger() {
  _suppressOutput = false;
}

function log(str) {
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.LOGGING_LEVEL !== "verbose" &&
    !_suppressOutput
  ) {
    console.log(str);
  }
}

function error(str) {
  if (
    !_suppressOutput &&
    (process.env.NODE_ENV !== "test" || process.env.LOGGING_LEVEL === "verbose")
  ) {
    console.error(str);
  }
}

function logAndReturnError(err) {
  error(err);
  return err;
}

const always = {
  log: (str) => console.log(str),
  error: (str) => console.error(str),
};

module.exports = {
  log,
  error,
  always,
  logAndReturnError,
  suppressLogger,
  enableLogger,
};

/* eslint-enable no-console */
