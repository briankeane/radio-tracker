const { faker } = require("@faker-js/faker");
const encryption = require("../lib/spotify/spotify.encryption");

/*
 * Creates a SpotifyUser
 * if there is no userId provided, it will create a user, too.
 */
async function createSpotifyUser(db, data = {}) {
  const encrpytedRefreshToken =
    data.refreshToken || encryption.encrypt(faker.datatype.uuid());
  return await db.models.SpotifyUser.create({
    spotifyUserId: data.spotifyUserId || faker.datatype.uuid(),
    accessToken: data.accessToken || faker.datatype.uuid().toString(),
    refreshToken: encrpytedRefreshToken,
  });
}

const createUser = async function (db, data = {}) {
  return await db.models.User.create({
    spotifyUserId: data.spotifyUserId || faker.datatype.uuid(),
    displayName: data.displayName || faker.name.firstName(),
    email: data.email || faker.internet.email(),
    profileImageUrl: data.profileImageUrl || randomImageURL(),
    role: data.role || "user",
  });
};

const createPlayolaUserSeed = function (data) {
  return {
    displayName: data.displayName || faker.name.firstName(),
    email: data.email || faker.internet.email(),
    profileImageUrl: data.profileImageUrl || randomImageURL(),
    spotifyUserId: data.spotifyUserId || faker.datatype.uuid(),
  };
};

const createPlayolaSongSeeds = function (count) {
  let seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      title: faker.random.words(3),
      artist: faker.name.fullName(),
      album: faker.random.words(3),
      durationMS: faker.datatype.number({ min: 10000, max: 240000 }),
      popularity: faker.datatype.number({ min: 0, max: 100 }),
      isrc: faker.datatype.uuid(),
      spotifyId: faker.datatype.uuid(),
      imageUrl: randomImageURL(),
    });
  }
  return seeds;
};

const createSong = async function (db, data = {}) {
  return await db.models.Song.create({
    title: data.title || faker.random.words(3),
    artist: data.artist || faker.name.fullName(),
    album: data.album || faker.random.words(3),
    durationMS:
      data.durationMS || faker.datatype.number({ min: 10000, max: 240000 }),
    popularity: data.popularity || faker.datatype.number({ min: 0, max: 100 }),
    youTubeId: data.youTubeId || faker.random.alpha(),
    endOfMessageMS:
      data.endOfMessageMS || faker.datatype.number({ min: 10000, max: 240000 }),
    endOfIntroMS:
      data.endOfIntroMS || faker.datatype.number({ min: 1000, max: 240000 }),
    beginningOfOutroMS:
      data.beginningOfOutroMS ||
      faker.datatype.number({ min: 1000, max: 240000 }),
    audioIsVerified: data.audioIsVerified || true,
    audioUrl: data.audioUrl || faker.internet.url(),
    isrc: data.isrc || faker.datatype.uuid(),
    spotifyId: data.spotifyId || faker.datatype.uuid(),
    imageUrl: data.imageUrl || randomImageURL(),
    audioGetterId: data.audioGetterId || faker.datatype.uuid(),
  });
};

const createCommercial = async function (db, data = {}) {
  return await db.models.Commercial.create({
    // title: data.title, // will use model default if not provided
    // artist: data.artist,
    durationMS: data.durationMS || 30000,
    endOfMessageMS: data.endOfMessageMS || 120000,
    audioUrl: data.audioUrl || faker.internet.url(),
    imageUrl: data.imageUrl || randomImageURL(),
  });
};

const createVoicetrack = async function (db, data = {}) {
  return await db.models.Voicetrack.create({
    durationMS: data.durationMS || 40000,
    audioUrl: data.audioUrl || faker.internet.url(),
    imageUrl: data.imageUrl || randomImageURL(),
  });
};

const createStationSong = async function (db, data = {}) {
  const stationSong = await db.models.StationSong.create({
    userId: data.userId || faker.datatype.uuid(),
    songId: data.songId || faker.datatype.uuid(),
  });
  await stationSong.reload({
    include: [{ model: db.models.AudioBlock, as: "song" }],
  });
  return stationSong;
};

const createStationSongsWithSongs = async function (db, { count, userId }) {
  const songs = [];
  const stationSongs = [];
  for (let i = 0; i < count; i++) {
    songs.push(await createSong(db));
    stationSongs.push(
      await createStationSong(db, { userId, songId: songs[i].id })
    );
  }
  return { songs, stationSongs };
};

function randomImageURL() {
  return `${faker.image.image()}/${Math.round(Math.random() * 1000)}`;
}
module.exports = {
  createSpotifyUser,
  createPlayolaUserSeed,
  createPlayolaSongSeeds,
  createStationSong,
  createStationSongsWithSongs,
  createUser,
  createSong,
  createCommercial,
  createVoicetrack,
};
