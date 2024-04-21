const promisify =
  (fn) =>
  (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

const db = require('../db');
const internetradio = require('../streamReader').getStationInfoPromise;
const axios = require('axios');
const PollResult = require('../db/models/pollResult.model/pollResult.model');

async function createStation({ name, streamUrl }) {
  // get the stream source
  const stationInfo = await internetradio(streamUrl);

  return await db.models.Station.create({
    name,
    streamUrl,
    streamSource: stationInfo.streamSource,
  });
}

async function getStation(stationId) {
  return await db.models.Station.findByPk(stationId);
}

async function executePoll({ station }) {
  let stationInfo;
  try {
    stationInfo = await internetradio({
      url: station.streamUrl,
      streamSource: station.streamSource,
    });
  } catch (err) {
    console.error(err);
    return await db.models.PollResult.create({
      errorMessage: err.message || 'Unknown error while reading stream',
    });
  }

  if (!stationInfo.title) {
    console.error('malformed stationInfo: ', JSON.stringify(stationInfo, 0, 2));
    return await db.models.PollResult.create({
      errorMessage: 'Error reading title from stationInfo',
    });
  }

  var searchTerm = await db.models.SearchTerm.findOne({
    where: { text: stationInfo.title },
  });

  if (searchTerm) {
    console.log('searchTerm found!');
    var searchResult = await db.models.PollResult.create({
      stationId: station.id,
      searchTermId: searchTerm.id,
    });
    return await db.models.PollResult.findByPk(searchResult.id, {
      include: [{ all: true, nested: true }],
    });
  }

  searchTerm = await findOrCreateSearchTerm(stationInfo.title);
  console.log('searchTerm: ', searchTerm);

  const poll = await db.models.PollResult.create({
    stationId: station.id,
    searchTermId: searchTerm.id,
  });

  console.log('poll: ', poll);
  const foundPoll = await db.models.PollResult.findByPk(poll.id, {
    include: [{ all: true, nested: true }],
  });
  return { foundPoll, searchTerm };
}

async function findOrCreateSearchTerm(searchTermString) {
  var searchTerm = await db.models.SearchTerm.findOne({
    where: { text: searchTermString },
    include: db.models.Song,
  });
  console.log('searchTerm inside findOrCreateSearchTerm: ', searchTerm);

  if (searchTerm) {
    return searchTerm;
  }

  var songInfo = await searchFromMetadata(searchTermString);
  console.log('songInfo: ', songInfo);
  var track = songInfo?.results?.[0];
  var song;
  if (track) {
    var songInfo = songPropertiesFromTrack(track);
    const [song, created] = await db.models.Song.findOrCreate({
      where: { itunesTrackId: songInfo.itunesTrackId },
      defaults: {
        ...songInfo,
      },
    });
  }

  searchTerm = await db.models.SearchTerm.create({
    text: searchTermString,
    songId: song?.id,
  });

  return searchTerm;
}

async function getNowPlayingForUrl(url) {
  console.log('url: ', url);
  const stationInfo = await internetradio({ url });
  console.log(stationInfo);
  const searchTermText = stationInfo.title;
  const searchTerm = await db.models.SearchTerm.findOne({
    where: { text: searchTermText },
    include: db.models.Song,
  });

  if (searchTerm) return searchTerm;

  const searchResult = await searchFromMetadata(stationInfo.title);
  var createdSong;
  var itunesResults = searchResult?.results?.[0] || {};
  var songProps = songPropertiesFromTrack({ ...itunesResults, searchTerm });
  if (!searchResult?.results?.count) {
    createdSong = await db.models.Song.findOrCreate({
      where: { searchTermId: searchTerm.id },
      defaults: songProps,
    });
  } else {
    createdSong = await db.models.Song.create(
      songFromTrack(searchResult.results.count)
    );
  }

  return createdSong;
}

function songPropertiesFromTrack(track) {
  return {
    title: track.trackName,
    itunesTrackId: String(track.trackId),
    artist: track.artistName,
    album: track.collectionName,
    itunesTrackViewUrl: track.trackViewUrl,
    artworkUrl: track.artworkUrl100,
    searchTerm: track.searchTerm,
  };
}

async function searchFromMetadata(searchTerm) {
  const url = createUrl(searchTerm);
  const response = await axios({ method: 'get', url, responseType: 'json' });
  return response.data;
}

function createUrl(searchTerm) {
  let cleanedSearchTerm = cleanSearchTerm(searchTerm);
  let encodedSearchTerm = encodeURIComponent(cleanedSearchTerm);
  console.log('encodedSearchTerm: ', encodedSearchTerm);
  return `https://itunes.apple.com/search?term=${encodedSearchTerm}&entity=song`;
}

function cleanSearchTerm(searchTerm) {
  return searchTerm.replace('???', '');
}

module.exports = {
  getStation,
  executePoll,
  createStation,
  searchFromMetadata,
  getNowPlayingForUrl,
};
