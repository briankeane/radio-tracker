const { assert } = require("chai");
const logger = require("../logger");

async function clearDatabase(db) {
  if (process.env.NODE_ENV !== "test") return; // for safety
  for (let model of Object.keys(db.models)) {
    await db.models[model].destroy({ where: {}, force: true });
  }
}

async function waitForInstanceToExist(
  model,
  query,
  timeout = 1000,
  currentTimeoutCount = 10
) {
  const results = await model.findAll(query);
  if (!results.length) {
    if (currentTimeoutCount < timeout) {
      return waitForInstanceToExist(
        model,
        query,
        timeout,
        currentTimeoutCount + 10
      );
    } else {
      throw assert.fail("model failed to create");
    }
  } else {
    return results[0];
  }
}

async function assertInstancePropertyEventuallyEquals(
  instance,
  propertyName,
  expectedValue,
  timeout = 1000,
  currentTimeoutCount = 10
) {
  await instance.reload();
  if (instance[propertyName] === expectedValue) {
    return true;
  } else if (currentTimeoutCount < timeout) {
    return assertInstancePropertyEventuallyEquals(
      instance,
      propertyName,
      expectedValue,
      timeout,
      currentTimeoutCount + 10
    );
  } else {
    throw assert.fail(
      `expected ${propertyName} to eventually equal ${expectedValue}, got ${instance[propertyName]}`
    );
  }
}

function checkAndClearNocks(nock) {
  if (!nock.isDone()) {
    logger.always.log("remaining Nocks: ", nock.pendingMocks());
    throw assert.fail("Not all nock interceptors were used!");
  }
  nock.cleanAll();
}

module.exports = {
  clearDatabase,
  assertInstancePropertyEventuallyEquals,
  waitForInstanceToExist,
  checkAndClearNocks,
};
