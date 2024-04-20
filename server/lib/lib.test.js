const { assert } = require('chai');
const lib = require('./lib');
const db = require('../db');
const models = db.models;
const sinon = require('sinon');
const { clearDatabase } = require('../test/test.helpers');

const encryption = require('./spotify/spotify.encryption');
const eventStream = require('./events');
const events = require('./events/events');
const errors = require('./errors');
const nock = require('nock');
const audioProvider = require('../lib/audioProvider');
const { v4: UUID } = require('uuid');

describe('User library functions', function () {});
