const app = require("../../server");
const request = require("supertest");
const { assert } = require("chai");
const db = require("../../db");
const { clearDatabase } = require("../../test/test.helpers");
const { createUser } = require("../../test/testDataGenerator");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../../lib/jwt");

describe("VoiceTrack", function () {
  let user, token;
  this.afterEach(async function () {
    await clearDatabase(db);
  });

  before(async function () {
    await clearDatabase(db);
  });

  beforeEach(async function () {
    user = await createUser(db);
    token = await generateToken(user);
  });

  describe("CREATE -- TODO: ADD THESE", function () {});
  describe("Create Upload Url -- TODO: ADD THESE", function () {});
});