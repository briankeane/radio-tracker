const { assert } = require("chai");
const logger = require("../logger");
const moment = require("moment");

/*
 * Duplicates from playlistGenerator.js for tests
 */
const AIRTIME_BLOCK_SIZE_MIN = 30;
function getAirtimeBlock(airtime) {
  let regularDate = moment.isMoment(airtime) ? airtime.toDate() : airtime;
  return Math.floor(
    regularDate.getTime() / (1000.0 * 60 * AIRTIME_BLOCK_SIZE_MIN)
  );
}

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

function assertHasConsecutivePlaylistPositions(playlist) {
  for (let i = 0; i < playlist.length; i++) {
    if (i > 0) {
      assert.isTrue(
        playlist[i].playlistPosition === playlist[i - 1].playlistPosition + 1,
        `playlistPositions are not consecutive for playlistPositions: ${
          playlist[i - 1].playlistPosition
        }, ${playlist[i].playlistPosition}`
      );
    }
  }
}

function assertCommercialsAreImmediatelyAfterTopAndBottomofHour(playlist) {
  let currentAirtimeBlock = getAirtimeBlock(playlist[0].airtime);
  for (let i = 1; i < playlist.length; i++) {
    let spin = playlist[i];
    if (getAirtimeBlock(spin.airtime) !== currentAirtimeBlock) {
      assert.equal(
        spin.audioBlock.type,
        "commercial",
        "expected commercial not present"
      );
      currentAirtimeBlock = getAirtimeBlock(spin.airtime);
    } else {
      assert.notEqual(
        spin.audioBlock.type,
        "commercial",
        "commercial found in the wrong place"
      );
    }
  }
}

function logPlaylist(playlist, msg = "playlist log:") {
  console.log(`---------------------- ${msg} ---------------------------`);
  console.table(
    playlist.map((spin) => ({
      playlistPosition: spin.playlistPosition,
      title: spin.audioBlock.title,
      airtime: moment(spin.airtime).format("h:mm:ss"),
      audioUrl: spin.audioBlock.audioUrl,
      endOfMessageMS: spin.audioBlock.endOfMessageMS,
      beginningOfOutroMS: spin.audioBlock.beginningOfOutroMS,
      endOfIntroMS: spin.audioBlock.endOfIntroMS,
    }))
  );
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
  assertHasConsecutivePlaylistPositions,
  assertCommercialsAreImmediatelyAfterTopAndBottomofHour,
  waitForInstanceToExist,
  checkAndClearNocks,
  logPlaylist,
};
