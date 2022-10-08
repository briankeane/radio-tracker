/* eslint-disable no-console */
var _suppressOutput = false;

export function suppressLogger() {
  _suppressOutput = true;
}

export function enableLogger() {
  _suppressOutput = false;
}

export function log(str) {
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.LOGGING_LEVEL !== "verbose" &&
    !_suppressOutput
  ) {
    console.log(str);
  }
}

export function error(str) {
  if (
    !_suppressOutput &&
    (process.env.NODE_ENV !== "test" || process.env.LOGGING_LEVEL === "verbose")
  ) {
    console.error(str);
  }
}

export function logAndReturnError(err) {
  error(err);
  return err;
}

export const always = {
  log: (str) => console.log(str),
  error: (str) => console.error(str),
};

export default {
  log,
  error,
  always,
  logAndReturnError,
  suppressLogger,
  enableLogger,
};

/* eslint-enable no-console */
