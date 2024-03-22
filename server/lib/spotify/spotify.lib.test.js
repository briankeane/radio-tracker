const { assert } = require('chai');
const lib = require('./spotify.lib');
const db = require('../../db');
const spotifyService = require('./spotify.service');
const sinon = require('sinon');
const {
  api_get_me_200,
  api_get_me_recently_played_200,
  api_get_me_top_tracks_200,
  api_get_me_saved_tracks_200,
  api_get_me_saved_tracks_final_chunk_200,
  api_get_track_200,
} = require('../../test/mockResponses/spotify');
const {
  createTracks,
  formatLikeGetTopTracks,
  formatLikeGetSavedTracks,
} = require('../../test/spotifyTestDataGenerator');
const { createSpotifyUser } = require('../../test/testDataGenerator');
const { clearDatabase } = require('../../test/test.helpers');
const { TopTracksTimeRange } = require('./spotify.service');

describe('Spotify Library functions', function () {
  var getMeStub;
  const accessToken = 'asdfafsd';
  const refreshToken = 'qewrqwer';
  const email = 'testymctesterson@example.com';

  before(async function () {
    await clearDatabase(db);
  });

  afterEach(async function () {
    await clearDatabase(db);
  });

  describe('createUser', function () {
    beforeEach(function () {
      getMeStub = sinon.stub(spotifyService, 'getMe').resolves(api_get_me_200);
    });

    afterEach(async function () {
      getMeStub.restore();
    });

    it('creates a SpotifyUser from accessToken and refreshToken', async function () {
      var spotifyUser = await lib.findOrCreateSpotifyUser({
        accessToken,
        refreshToken,
      });
      assert.equal(spotifyUser.accessToken, accessToken);
      assert.equal(spotifyUser.refreshToken, refreshToken);
      assert.equal(spotifyUser.spotifyUserId, api_get_me_200['id']);
    });

    it('creates a SpotifyUser from only a refreshToken', async function () {
      var spotifyUser = await lib.findOrCreateSpotifyUser({
        refreshToken,
      });
      // note: accessToken refresh will be taken care of by spotify.api interceptor
      assert.equal(spotifyUser.refreshToken, refreshToken);
      assert.equal(spotifyUser.spotifyUserId, api_get_me_200['id']);
    });

    it('only updates the accessToken if the SpotifyUser already exists', async function () {
      createSpotifyUser(db, {
        refreshToken,
        accessToken: 'oldAccessToken',
        email,
      });
      var spotifyUser = await lib.findOrCreateSpotifyUser({
        accessToken,
        refreshToken,
      });
      assert.equal(spotifyUser.accessToken, accessToken);
      assert.equal(spotifyUser.refreshToken, refreshToken);
    });
  });

  describe('get UserProfileSeed', function () {
    beforeEach(function () {
      getMeStub = sinon.stub(spotifyService, 'getMe').resolves(api_get_me_200);
    });

    afterEach(function () {
      getMeStub.restore();
    });

    it('gets a properly formatted PlayolaUserProfile', async function () {
      const seed = await lib.getPlayolaUserSeed({ accessToken, refreshToken });
      assert.equal(seed.displayName, api_get_me_200.display_name);
      assert.equal(seed.email, api_get_me_200.email);
      assert.equal(seed.profileImageUrl, api_get_me_200.images[0].url);
      sinon.assert.calledWith(getMeStub, { accessToken, refreshToken });
    });

    it('gracefully handles no images in seed', async function () {
      const getMeResponseWithoutImages = Object.assign({}, api_get_me_200);
      getMeResponseWithoutImages['images'] = undefined;
      getMeStub.resolves(getMeResponseWithoutImages);
      const seed = await lib.getPlayolaUserSeed({ accessToken, refreshToken });
      assert.equal(seed.displayName, api_get_me_200.display_name);
      assert.equal(seed.email, api_get_me_200.email);
      assert.isUndefined(seed.profileImageUrl);
    });

    it('gracefully handles no images.length in seed', async function () {
      const getMeResponseWithoutImages = Object.assign({}, api_get_me_200);
      getMeResponseWithoutImages.images = [];
      getMeStub.resolves(getMeResponseWithoutImages);
      const seed = await lib.getPlayolaUserSeed({ accessToken, refreshToken });
      assert.equal(seed.displayName, api_get_me_200.display_name);
      assert.equal(seed.email, api_get_me_200.email);
      assert.isUndefined(seed.profileImageUrl);
    });

    it('creates a spotifyUser if it does not yet exist', async function () {
      const seed = await lib.getPlayolaUserSeed({ accessToken, refreshToken });
      let foundSpotifyUser = await db.models.SpotifyUser.findOne({
        where: { spotifyUserId: seed.spotifyUserId },
      });
      assert.isOk(foundSpotifyUser);
      assert.equal(foundSpotifyUser.spotifyUserId, seed.spotifyUserId);
      assert.equal(foundSpotifyUser.refreshToken, refreshToken);
      assert.equal(foundSpotifyUser.accessToken, accessToken);
    });

    it('updates a spotifyUser if they exist already', async function () {
      const existingSpotifyUser = await db.models.SpotifyUser.create({
        spotifyUserId: api_get_me_200.id,
        accessToken: 'oldAccessToken',
        refreshToken: 'oldRefreshToken',
      });

      await lib.getPlayolaUserSeed({ accessToken, refreshToken });
      let foundSpotifyUser = await db.models.SpotifyUser.findOne({
        where: { spotifyUserId: existingSpotifyUser.spotifyUserId },
      });
      assert.isOk(foundSpotifyUser);
      assert.equal(foundSpotifyUser.id, existingSpotifyUser.id);
    });
  });

  describe('getTrack', function () {
    var getTrackStub, spotifyUser;

    beforeEach(async function () {
      getTrackStub = sinon
        .stub(spotifyService, 'getTrack')
        .resolves(api_get_track_200);
      spotifyUser = await createSpotifyUser(db);
    });

    afterEach(function () {
      getTrackStub.restore();
    });

    it('gets a track', async function () {
      const songSeed = await lib.getSongSeedFromSpotifyId({
        spotifyUserId: spotifyUser.spotifyUserId,
        spotifyId: api_get_track_200['id'],
      });
      // minimal checks -- songSeed is tested elsewhere
      assert.equal(songSeed.title, api_get_track_200['name']);
      assert.equal(songSeed.spotifyId, api_get_track_200['id']);
    });
  });

  describe('getUserRecentlyPlayed', function () {
    var getRecentlyPlayedStub, getUsersTopTracksStub, spotifyUser;

    beforeEach(async function () {
      getRecentlyPlayedStub = sinon
        .stub(spotifyService, 'getRecentlyPlayedTracks')
        .resolves(api_get_me_recently_played_200);
      getUsersTopTracksStub = sinon
        .stub(spotifyService, 'getUsersTopTracks')
        .resolves(api_get_me_top_tracks_200);
      spotifyUser = await createSpotifyUser(db);
    });

    afterEach(function () {
      getRecentlyPlayedStub.restore();
      getUsersTopTracksStub.restore();
    });

    it('gets recently played tracks', async function () {
      const tracks = await lib.getRecentlyPlayedTracks({
        spotifyUserId: spotifyUser.spotifyUserId,
      });
      assert.deepEqual(
        tracks,
        api_get_me_recently_played_200['items'].map((item) => item.track)
      );
      sinon.assert.calledWith(getRecentlyPlayedStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
      });
    });

    it('gets users top tracks', async function () {
      const tracks = await lib.getUsersTopTracks({
        spotifyUserId: spotifyUser.spotifyUserId,
      });
      const expectedTracks = api_get_me_top_tracks_200['items'].map((item) => ({
        ...item,
        userAffinity: 0.8,
      }));
      assert.deepEqual(tracks, expectedTracks);
      sinon.assert.calledWith(getUsersTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.SHORT_TERM,
      });
      sinon.assert.calledWith(getUsersTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.MEDIUM_TERM,
      });
      sinon.assert.calledWith(getUsersTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.LONG_TERM,
      });
    });
  });

  describe('getUserSavedTracks', function () {
    var getUserSavedTracksStub, spotifyUser;
    beforeEach(async function () {
      spotifyUser = await createSpotifyUser(db);
      getUserSavedTracksStub = sinon.stub(
        spotifyService,
        'getUsersSavedTracks'
      );
      getUserSavedTracksStub.onCall(0).resolves(api_get_me_saved_tracks_200);
      getUserSavedTracksStub
        .onCall(1)
        .resolves(api_get_me_saved_tracks_final_chunk_200);
    });

    afterEach(function () {
      getUserSavedTracksStub.restore();
    });

    it('works even with pagination', async function () {
      const receivedTracksChunk1 = api_get_me_saved_tracks_200['items'].map(
        (item) => item.track
      );
      const receivedTracksChunk2 = api_get_me_saved_tracks_final_chunk_200[
        'items'
      ].map((item) => item.track);
      const totalExpectedTracks = receivedTracksChunk1
        .concat(receivedTracksChunk2)
        .map((track) => ({ ...track, userAffinity: 0.6 }));
      const tracks = await lib.getUsersSavedTracks({
        spotifyUserId: spotifyUser.spotifyUserId,
      });
      assert.deepEqual(totalExpectedTracks, tracks);
      sinon.assert.calledWith(getUserSavedTracksStub.firstCall, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        offset: 0,
      });
      sinon.assert.calledWith(getUserSavedTracksStub.secondCall, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        offset: 50,
      });
    });

    it('assigns userAffinity', async function () {
      const tracks = await lib.getUsersSavedTracks({
        spotifyUserId: spotifyUser.spotifyUserId,
      });
      assert.isOk(tracks.length);
      for (let track of tracks) {
        assert.equal(track.userAffinity, 0.6);
      }
    });
  });

  describe('getUserRelatedSongSeeds', function () {
    var totalInitialReceivedTracks,
      spotifyUser,
      stubbedSavedTracks,
      stubbedTopTracksAll,
      stubbedTopTracksLongTerm,
      stubbedTopTracksMediumTerm,
      stubbedTopTracksShortTerm,
      stubbedRecommendedTracks;
    let libGetSavedTracksStub, libGetTopTracksStub, apiGetRecommendedTracksStub;

    function createRecommendedTracks({ count }) {
      var tracks = createTracks({ count });
      stubbedRecommendedTracks = stubbedRecommendedTracks.concat(tracks);
      return tracks;
    }

    beforeEach(async function () {
      this.timeout(5000);
      // tracks returned initially should have this makeup:
      totalInitialReceivedTracks = createTracks({
        count: 36,
        desiredArtistIDCounts: {
          eight: 8,
          seven: 7,
          six: 6,
          five: 5,
          four: 4,
          three: 3,
          two: 2,
          one: 1,
        },
      });
      stubbedSavedTracks = totalInitialReceivedTracks.slice(0, 5);
      stubbedTopTracksAll = totalInitialReceivedTracks.slice(3);
      stubbedTopTracksLongTerm = stubbedTopTracksAll.slice(0, 17);
      stubbedTopTracksMediumTerm = stubbedTopTracksAll.slice(15, 25); // make these overlap a bit
      stubbedTopTracksShortTerm = stubbedTopTracksAll.slice(23);

      stubbedRecommendedTracks = [];
      libGetSavedTracksStub = sinon
        .stub(spotifyService, 'getUsersSavedTracks')
        .resolves(formatLikeGetSavedTracks(stubbedSavedTracks));
      libGetTopTracksStub = sinon.stub(spotifyService, 'getUsersTopTracks');
      libGetTopTracksStub
        .onCall(0)
        .resolves(formatLikeGetTopTracks(stubbedTopTracksLongTerm));
      libGetTopTracksStub
        .onCall(1)
        .resolves(formatLikeGetTopTracks(stubbedTopTracksMediumTerm));
      libGetTopTracksStub
        .onCall(2)
        .resolves(formatLikeGetTopTracks(stubbedTopTracksShortTerm));
      apiGetRecommendedTracksStub = sinon
        .stub(spotifyService, 'getRecommendedTracks')
        .callsFake(() => {
          return { tracks: createRecommendedTracks({ count: 10 }) };
        });
      spotifyUser = await createSpotifyUser(db);
    });

    afterEach(function () {
      libGetTopTracksStub.restore();
      libGetSavedTracksStub.restore();
      apiGetRecommendedTracksStub.restore();
    });

    it.skip('gets all types of topTracks', async function () {
      const similarSongs = await lib.getUserRelatedSongSeeds({
        spotifyUserId: spotifyUser.spotifyUserId,
        minimum: 50,
      });
      sinon.assert.calledWith(libGetTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.SHORT_TERM,
      });
      sinon.assert.calledWith(libGetTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.MEDIUM_TERM,
      });
      sinon.assert.calledWith(libGetTopTracksStub, {
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange.LONG_TERM,
      });
      assert.equal(similarSongs.length, stubbedTopTracksAll.length);
    });

    it('works even if it has to pad with similar artists', async function () {
      const similarSongs = await lib.getUserRelatedSongSeeds({
        spotifyUserId: spotifyUser.spotifyUserId,
        minimum: 50,
      });
      assert.equal(similarSongs.length, 56);
      sinon.assert.calledWith(apiGetRecommendedTracksStub.firstCall, {
        seed_artists: ['eight', 'seven', 'six', 'five', 'four'],
      });
      sinon.assert.calledWith(apiGetRecommendedTracksStub.secondCall, {
        seed_artists: ['six', 'five', 'four', 'three', 'two'],
      });
    });

    it('correctly assigns track affinity', async function () {
      const similarSongs = await lib.getUserRelatedSongSeeds({
        spotifyUserId: spotifyUser.spotifyUserId,
        minimum: 50,
      });
      const stubbedSavedTrackIds = stubbedSavedTracks.map((track) => track.id);
      const stubbedTopTrackIds = stubbedTopTracksAll.map((track) => track.id);
      const stubbedRecommendedTrackIds = stubbedRecommendedTracks.map(
        (track) => track.id
      );
      for (let song of similarSongs) {
        if (stubbedTopTrackIds.includes(song.spotifyId)) {
          assert.equal(song.userAffinity, 0.8);
          // "ELSE IF" so that songs included in multiple lists only get the
          // highest affinity assigned
        } else if (stubbedSavedTrackIds.includes(song.spotifyId)) {
          assert.equal(song.userAffinity, 0.6);
        } else if (stubbedRecommendedTrackIds.includes(song.spotifyId)) {
          assert.equal(song.userAffinity, 0.2);
        } else {
          assert.fail(`song id: ${song.spotifyId} not found in lists`);
        }
      }
    });
  });
});
