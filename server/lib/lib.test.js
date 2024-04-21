const { assert } = require('chai');
const lib = require('./lib');
const db = require('../db');
const models = db.models;
const streamReader = require('../streamReader');
const sinon = require('sinon');
const { clearDatabase } = require('../test/test.helpers');

const encryption = require('./spotify/spotify.encryption');
const eventStream = require('./events');
const events = require('./events/events');
const errors = require('./errors');
const nock = require('nock');
const audioProvider = require('../lib/audioProvider');
const { v4: UUID } = require('uuid');
const { api_search_song_200 } = require('../test/mockResponses/itunes');
const {
  life_without_you_now_playing,
} = require('../test/mockResponses/nowPlayingInfo');

describe('User library functions', function () {
  beforeEach(async function () {
    await clearDatabase();
  });

  describe('executes a poll', function () {
    it('when song and searchTerm are new', function () {
      sinon
        .stub(streamReader, 'getStationInfoPromise')
        .resolves(life_without_you_now_playing);
    });
  });
});
