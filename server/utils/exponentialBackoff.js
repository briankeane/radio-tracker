const logger = require("../logger");

function exponentialBackoff(api, err) {
  var config = err.config;
  logger.log(
    "performing exponential backoff. retry count: ",
    config.__retryCount
  );

  // If config does not exist or the retry option is not set, reject
  if (!config || !config.retry) return Promise.reject(err);

  // Set the variable for keeping track of the retry count
  config.__retryCount = config.__retryCount || 0;

  // Check if we've maxed out the total number of retries
  if (config.__retryCount >= config.retry) {
    // Reject with the error
    return Promise.reject(err);
  }

  // Increase the retry count
  config.__retryCount += 1;

  // Create new promise to handle exponential backoff
  var backoff = new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, config.retryDelay || 1);
  });

  // Return the promise in which recalls axios to retry the request
  return backoff.then(() => {
    return api(config);
  });
}

module.exports = exponentialBackoff;
