const app = require("../../server");
const request = require("supertest");
const { assert } = require("chai");

describe("Authorization and Authentication", function () {
  before(async function () {
    await app.isReadyPromise;
  });

  describe("HealthCheck", function () {
    it("checks the health", function (done) {
      request(app)
        .get("/v1/healthCheck")
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          assert.equal(res.body.healthy, true);
          done();
        });
    });
  });
});
