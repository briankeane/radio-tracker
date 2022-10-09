const { faker } = require("@faker-js/faker");

function createTrack() {
  return {
    album: {
      album_type: "ALBUM",
      artists: [
        {
          external_urls: {
            spotify: "https://open.spotify.com/artist/6zkX5fhrSD4tdVOmimR9wB",
          },
          href: "https://api.spotify.com/v1/artists/6zkX5fhrSD4tdVOmimR9wB",
          id: "6zkX5fhrSD4tdVOmimR9wB",
          name: faker.name.fullName(),
          type: "artist",
          uri: "spotify:artist:6zkX5fhrSD4tdVOmimR9wB",
        },
      ],
      available_markets: ["US", "UY"],
      external_urls: {
        spotify: "https://open.spotify.com/album/2SJi88DNkZZON13ow7leMi",
      },
      href: "https://api.spotify.com/v1/albums/2SJi88DNkZZON13ow7leMi",
      id: faker.datatype.uuid(),
      images: [
        {
          height: 600,
          url: "https://i.scdn.co/image/66e83ed78b4b3b7cdb509abe5f5d29d472c7545d",
          width: 600,
        },
        {
          height: 300,
          url: "https://i.scdn.co/image/5472957ea1779f1c7066bf7c616f8d1e277af2f5",
          width: 300,
        },
        {
          height: 64,
          url: "https://i.scdn.co/image/0562f7c790ba45a5bed7810c69d0804c3004ee9b",
          width: 64,
        },
      ],
      name: faker.random.words(3),
      release_date: "2014-01-31",
      release_date_precision: "day",
      total_tracks: 10,
      type: "album",
      uri: "spotify:album:2SJi88DNkZZON13ow7leMi",
    },
    artists: [
      {
        external_urls: {
          spotify: "https://open.spotify.com/artist/6zkX5fhrSD4tdVOmimR9wB",
        },
        href: "https://api.spotify.com/v1/artists/6zkX5fhrSD4tdVOmimR9wB",
        id: faker.datatype.uuid(),
        name: faker.name.fullName(),
        type: "artist",
        uri: "spotify:artist:6zkX5fhrSD4tdVOmimR9wB",
      },
    ],
    available_markets: ["US", "UY"],
    disc_number: 1,
    duration_ms: 162277,
    explicit: false,
    external_ids: {
      isrc: faker.datatype.uuid(),
    },
    external_urls: {
      spotify: "https://open.spotify.com/track/3CHTaat3MWIfFTT3ioSi4M",
    },
    href: "https://api.spotify.com/v1/tracks/3CHTaat3MWIfFTT3ioSi4M",
    id: faker.datatype.uuid(),
    is_local: false,
    name: faker.random.words(3),
    popularity: 18,
    preview_url:
      "https://p.scdn.co/mp3-preview/96bbb381ae39f7e9258999a59b0a7d8fd21621f3?cid=0c37e34b70fb4f6d9f4ad64d597e1a95",
    track_number: 7,
    type: "track",
    uri: "spotify:track:3CHTaat3MWIfFTT3ioSi4M",
  };
}

/*
 * desiredArtistIDCounts contains a list of artists and their desired track count
 */
function createTracks({ count, desiredArtistIDCounts = {} }) {
  var tracks = [];
  for (let i = 0; i < count; i++) {
    tracks.push(createTrack());
  }
  var currentIndex = 0;

  // IF there are desired artist ids, replace the generated
  // ones with the desired ones
  Object.keys(desiredArtistIDCounts).forEach((key) => {
    for (let i = 0; i < desiredArtistIDCounts[key]; i++) {
      tracks[currentIndex].artists[0].id = key;
      currentIndex += 1;
    }
  });
  return tracks;
}

function formatLikeGetSavedTracks(tracks) {
  return {
    items: tracks.map((track) => ({ track: track })),
  };
}

function formatLikeGetTopTracks(tracks) {
  return {
    items: tracks,
  };
}

module.exports = {
  createTracks,
  formatLikeGetSavedTracks,
  formatLikeGetTopTracks,
};
