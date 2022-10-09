/*
 * Global setup code for mocha tests
 * note: I think this works (executes first) because
 * it is not inside of a describe block.   It still must
 * stay within the '${ROOT}/test' folder.
 */

const app = require("../server");

before(async function () {
  this.timeout(5000);
  await app.isReadyPromise;
});
