const spotifyService = require("../spotify/spotify.service");
const { TopTracksTimeRange } = spotifyService;
const db = require("../../db");
const { logAndReturnError } = require("../../logger");

const UserAffinity = {
  SAVED_TRACKS: 0.6,
  RECOMMENDED_TRACKS: 0.2,
  TOP_TRACKS: 0.8,
};

/*
 * Actual work goes here
 */
async function updateTokens({ oldTokens, newTokens }) {
  var spotifyUser = await db.models.SpotifyUser.findOne({ where: oldTokens });
  if (spotifyUser) {
    spotifyUser = await spotifyUser.update(newTokens);
  }
  return spotifyUser;
}

function getPlayolaUserSeed({ accessToken, refreshToken }) {
  return new Promise((resolve, reject) => {
    const finish = async function (playolaProfile) {
      // make sure the tokens are stored for future use
      const { spotifyUserId } = playolaProfile;
      await db.models.SpotifyUser.findOrCreate({
        where: { spotifyUserId },
        defaults: { accessToken, refreshToken, spotifyUserId },
      });
      return resolve(playolaProfile);
    };

    spotifyService
      .getMe({ accessToken, refreshToken })
      .then((profile) => finish(playolaProfileFromSpotifyProfile(profile)))
      .catch((err) => reject(logAndReturnError(err)));
  });
}

/*
 * A User is automatically created anytime a SpotifyUser is created.
 */
async function createSpotifyUser({ accessToken, refreshToken }) {
  let rawProfile = await spotifyService.getMe({ accessToken, refreshToken });
  const spotifyUserId = rawProfile["id"];
  const [spotifyUser, _] = await db.models.SpotifyUser.findOrCreate({
    where: { spotifyUserId },
    defaults: { accessToken, refreshToken, spotifyUserId },
  });
  return spotifyUser;
}

/*
 * Note:  As of now, spotify only allows 50 max results for both
 * getRecentlyPlayedTracks and getUsersTopTracks.  In the future, we
 * may want to allow for pagination, but for now it does not matter
 */

function getRecentlyPlayedTracks({ spotifyUserId }) {
  return new Promise((resolve, reject) => {
    db.models.SpotifyUser.findOne({ where: { spotifyUserId } })
      .then((spotifyUser) =>
        spotifyService.getRecentlyPlayedTracks({
          accessToken: spotifyUser.accessToken,
          refreshToken: spotifyUser.refreshToken,
        })
      )
      .then((data) => resolve(data.items.map((item) => item.track)))
      .catch((err) => reject(logAndReturnError(err)));
  });
}

async function getUsersTopTracks({ spotifyUserId }) {
  const spotifyUser = await db.models.SpotifyUser.findOne({
    where: { spotifyUserId },
  });
  const dataPromises = [];
  for (let key in TopTracksTimeRange) {
    dataPromises.push(
      spotifyService.getUsersTopTracks({
        accessToken: spotifyUser.accessToken,
        refreshToken: spotifyUser.refreshToken,
        timeRange: TopTracksTimeRange[key],
      })
    );
  }
  const results = await Promise.all(dataPromises);
  const data = removeDuplicates(
    [].concat(...results.map((result) => result.items))
  );
  return data.map((item) => ({
    ...item,
    userAffinity: UserAffinity.TOP_TRACKS,
  }));
}

function getUsersSavedTracks({ spotifyUserId, maxTrackCount = 1000 }) {
  async function _getUsersSavedTracks({
    accessToken,
    refreshToken,
    offset = 0,
    previouslyReceivedTracks = [],
  }) {
    const data = await spotifyService.getUsersSavedTracks({
      accessToken,
      refreshToken,
      offset,
    });
    const receivedTracks = data.items.map((item) => ({
      ...item.track,
      userAffinity: UserAffinity.SAVED_TRACKS,
    }));
    const newPreviouslyReceivedTracks =
      previouslyReceivedTracks.concat(receivedTracks);
    if (newPreviouslyReceivedTracks.length >= maxTrackCount || !data.next) {
      return newPreviouslyReceivedTracks;
    } else {
      return newPreviouslyReceivedTracks.concat(
        await _getUsersSavedTracks({
          accessToken,
          refreshToken,
          offset: offset + 50,
          previouslyReceivedTracks,
        })
      );
    }
  }

  return new Promise((resolve, reject) => {
    db.models.SpotifyUser.findOne({ where: { spotifyUserId } })
      .then((spotifyUser) =>
        _getUsersSavedTracks({
          accessToken: spotifyUser.accessToken,
          refreshToken: spotifyUser.refreshToken,
        })
      )
      .then((tracks) => resolve(tracks))
      .catch((err) => reject(logAndReturnError(err)));
  });
}

async function getUserRelatedSongSeeds({ spotifyUserId, minimum = 150 }) {
  let [topTracks, savedTracks] = await Promise.all([
    getUsersTopTracks({ spotifyUserId }),
    getUsersSavedTracks({ spotifyUserId }),
  ]);
  var totalTracks = removeDuplicates(topTracks.concat(savedTracks));
  totalTracks = await padWithSimilarSongs({ tracks: totalTracks, minimum });
  return spotifyTracksToSongSeeds(totalTracks);
}

async function getSongSeedFromSpotifyId({ spotifyUserId, spotifyId }) {
  return new Promise((resolve, reject) => {
    db.models.SpotifyUser.findOne({ where: { spotifyUserId } })
      .then((spotifyUser) =>
        spotifyService.getTrack({
          accessToken: spotifyUser.accessToken,
          refreshToken: spotifyUser.refreshToken,
          spotifyId,
        })
      )
      .then((spotifyTrack) => spotifyTracksToSongSeeds([spotifyTrack]))
      .then((songSeeds) => resolve(songSeeds[0]))
      .catch((err) => reject(logAndReturnError(err)));
  });
}
// async function getSongSeedForSpotifyId({ spotifyId})

/*
 * Helper functions
 */
function playolaProfileFromSpotifyProfile(spotifyProfile) {
  return {
    displayName: spotifyProfile.display_name,
    email: spotifyProfile.email,
    spotifyUserId: spotifyProfile.id,
    profileImageUrl:
      spotifyProfile.images && spotifyProfile.images.length
        ? spotifyProfile.images[0].url
        : undefined,
  };
}

async function padWithSimilarSongs({ tracks, minimum = 150 }) {
  async function _padWithSimilarSongs({ tracks, minimum, artists = [] }) {
    if (tracks.length >= minimum) return tracks;
    const seed_artists = artists.slice(0, 5).map((artist) => artist.id);
    const data = await spotifyService.getRecommendedTracks({ seed_artists });
    const newTracks = data.tracks.map((track) => ({
      ...track,
      userAffinity: 0.2,
    }));
    const updatedTracks = removeDuplicates(tracks.concat(newTracks));
    return await _padWithSimilarSongs({
      tracks: updatedTracks,
      minimum,
      artists: artists.slice(2),
    });
  }

  // produce on array of artists in order of their frequency
  function createArtistArray(tracks) {
    const artistInfo = {};
    for (let track of tracks) {
      if (!track["artists"] || !track["artists"].length) continue;
      let artist = track["artists"][0];
      if (!artistInfo[artist.id]) artistInfo[artist.id] = { artist, count: 0 };
      artistInfo[artist.id].count += 1;
    }
    const sortedArtistInfos = Object.values(artistInfo).sort((a, b) =>
      a.count < b.count ? 1 : -1
    );
    return sortedArtistInfos.map((info) => info.artist);
  }

  const artists = createArtistArray(tracks);
  return await _padWithSimilarSongs({ tracks, minimum, artists });
}

function removeDuplicates(tracks) {
  var alreadySeen = {};
  var dupesRemoved = [];
  var sortedTracks = tracks.sort((a, b) => b.userAffinity - a.userAffinity); // most liked songs first in list
  for (let track of sortedTracks) {
    if (!alreadySeen[track.id]) {
      alreadySeen[track.id] = true;
      dupesRemoved.push(track);
    }
  }
  return dupesRemoved;
}

function spotifyTracksToSongSeeds(tracks) {
  return tracks.map((track) => {
    return {
      title: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      durationMS: track.duration_ms,
      popularity: track.popularity,
      isrc: track.external_ids ? track.external_ids.isrc : undefined,
      spotifyId: track.id,
      imageUrl:
        track.album.images && track.album.images.length
          ? track.album.images[0].url
          : undefined,
      userAffinity: track.userAffinity,
    };
  });
}

module.exports = {
  createSpotifyUser,

  getPlayolaUserSeed,
  updateTokens,
  getRecentlyPlayedTracks,
  getUsersTopTracks,
  getUsersSavedTracks,

  getUserRelatedSongSeeds,
  getSongSeedFromSpotifyId,
  SPOTIFY_SCOPES: require("./spotify.service").SPOTIFY_SCOPES,
};
