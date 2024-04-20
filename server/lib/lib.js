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
const internetradio = promisify(require('../streamReader').getStationInfo);
const axios = require('axios');

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
    stationInfo = await internetradio(station.streamUrl, null);
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

  var searchTerm = await db.models.findOne({
    where: { searchTerm: searchTermText },
  });

  if (searchTerm) {
    return await db.models.PollResult.create({
      stationId: station.id,
      searchTerm,
    });
  }

  return await findOrCreateSearchTerm(searchTermString);
}

async function findOrCreateSearchTerm(searchTermString) {
  var searchTerm = await db.models.SearchTerm.findOne({
    where: { text: searchTermString },
    include: db.models.Song,
  });

  if (searchTerm) {
    return searchTerm;
  }

  var songInfo = await searchFromMetadata(searchTermString);
  var track = songInfo?.results?.[0];
  if (track) {
    var songInfo = songPropertiesFromTrack(track);
    await db.models.Song.findOrCreate({
      where: { itunesTrackId: track.itunesTrackId },
      defaults: {
        ...songInfo,
      },
    });
    song = await db.models.Song.findOne({
      where: { itunesTrackId: track.itunesTrackId },
      include: db.models.Song,
    });
  }

  searchTerm = await db.models.SearchTerm.create({
    text: searchTermText,
    songId: song.id,
  });

  return searchTerm;
}

async function getNowPlayingForUrl(url) {
  console.log('url: ', url);
  const stationInfo = await internetradio(url, null);
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
      where: { searchTerm },
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
    itunesTrackId: track.trackId,
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
