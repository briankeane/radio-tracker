const db = require("../../db");
const moment = require("moment");
const SongChooser = require("./songChooser");
const CommercialChooser = require("./commercialChooser");

const SONG_BINS = {
  heavy: 20,
  medium: 30,
};
const AIRTIME_BLOCK_SIZE_MIN = 30;

const lengthOfOutroMS = (audioBlock) =>
  audioBlock.endOfMessageMS - audioBlock.beginningOfOutroMS;

async function generatePlaylist({ userId }) {
  const playlistEndTime = moment().add(4, "hours");

  let stationSongs = await db.models.StationSong.findAllActive({ userId });
  const songChooser = new SongChooser({ stationSongs });
  const commercialChooser = new CommercialChooser({ userId });

  let playlist = await db.models.Spin.getPlaylist({ userId });

  // The generator needs at least 1 spin to get started.
  if (!playlist.length) {
    let airtime = moment().subtract(10, "seconds");
    let song = await songChooser.chooseSong({ airtime });
    let firstSpin = await db.models.Spin.create({
      userId,
      airtime,
      playlistPosition: 1,
      audioBlockId: song.id,
    });
    playlist.push(await firstSpin.reload({ include: [db.models.AudioBlock] }));
  }

  var airtimeBlock = getAirtimeBlock(lastAirtime(playlist));
  while (lastAirtime(playlist).isBefore(playlistEndTime)) {
    if (getAirtimeBlock(playlistEndMoment(playlist)) != airtimeBlock) {
      playlist.push(
        await createCommercialSpin({ userId, playlist, commercialChooser })
      );
      airtimeBlock = getAirtimeBlock(playlistEndMoment(playlist));
    } else {
      playlist.push(await createSongSpin({ userId, playlist, songChooser }));
    }
  }
  return playlist;
}

function airtimeForSpin({ currentPlaylist, spinData }) {
  if (!currentPlaylist.length) {
    return moment().subtract(10, "seconds");
  }

  let previousSpin = currentPlaylist[currentPlaylist.length - 1];

  // VoiceTracks require special overlapping calculations
  if (spinData.audioBlock.type === "voicetrack") {
    return airtimeForVoicetrackSpin({ currentPlaylist, spinData });
  }

  if (
    previousSpin.audioBlock.type === "voicetrack" &&
    spinData.audioBlock.type === "song"
  ) {
    return airtimeForSongFollowingVoicetrack({ currentPlaylist, spinData });
  }

  // everything else starts a the previous spin's endOfMessageMS
  return moment(previousSpin.airtime).add(
    previousSpin.audioBlock.endOfMessageMS,
    "milliseconds"
  );
}

function airtimeForVoicetrackSpin({ currentPlaylist, spinData }) {
  let previousSpin = currentPlaylist[currentPlaylist.length - 1];
  if (["voicetrack", "commercial"].includes(previousSpin.audioBlock.type)) {
    return moment(previousSpin.airtime).add(
      previousSpin.audioBlock.endOfMessageMS,
      "milliseconds"
    );
  }

  // previousSpin is a Song
  // If the voicetrack is long enough to cover the whole outro, start it at the previous spin's
  // begininningOfOutro
  if (
    lengthOfOutroMS(previousSpin.audioBlock) <= spinData.audioBlock.durationMS
  ) {
    return moment(previousSpin.airtime).add(
      previousSpin.audioBlock.beginningOfOutroMS,
      "milliseconds"
    );
  }

  // Voicetrack is shorter than the intro.  Cover half of the voicetrack
  return moment(previousSpin.airtime).add(
    spinData.audioBlock.durationMS / 2,
    "milliseconds"
  );
}

function airtimeForSongFollowingVoicetrack({ currentPlaylist, spinData }) {
  const voicetrackSpin = currentPlaylist[currentPlaylist.length - 1];
  const previousSpin =
    currentPlaylist.length >= 2
      ? currentPlaylist[currentPlaylist.length - 2]
      : undefined;

  const msLeftInVT = msLeftInVoicetrack({ previousSpin, voicetrackSpin });

  if (msLeftInVT <= spinData.audioBlock.endOfIntroMS) {
    if (!previousSpin) return endOfMessageMoment();
    return endOfMessageMoment(previousSpin);
  } else {
    return endOfMessageMoment(voicetrackSpin).subtract(
      spinData.audioBlock.endOfIntroMS,
      "ms"
    );
  }
}

async function createSongSpin({ userId, playlist, songChooser }) {
  let song = await songChooser.chooseSong({ playlist });
  let spinData = {
    audioBlock: song,
    audioBlockId: song.id,
    userId: userId,
    playlistPosition: playlist[playlist.length - 1].playlistPosition + 1,
  };
  spinData.airtime = airtimeForSpin({ currentPlaylist: playlist, spinData });

  let spin = await db.models.Spin.create(spinData);
  await spin.reload({ include: [db.models.AudioBlock] });
  return spin;
}

async function createCommercialSpin({ userId, playlist, commercialChooser }) {
  let commercial = await commercialChooser.chooseCommercial();

  let spinData = {
    userId,
    audioBlockId: commercial.id,
    audioBlock: commercial,
    playlistPosition: playlist[playlist.length - 1].playlistPosition + 1,
  };
  spinData.airtime = airtimeForSpin({ currentPlaylist: playlist, spinData });
  let spin = await db.models.Spin.create(spinData);
  await spin.reload({ include: [db.models.AudioBlock] });
  return spin;
}

function msLeftInVoicetrack({ voicetrackSpin, previousSpin }) {
  if (!previousSpin) {
    return voicetrackSpin.audioBlock.endOfMessageMS;
  }

  const diffInMS = moment
    .duration(
      endOfMessageMoment(previousSpin).diff(moment(voicetrackSpin.airtime))
    )
    .asMilliseconds();
  return voicetrackSpin.audioBlock.endOfMessageMS - diffInMS;
}

function getAirtimeBlock(airtime) {
  return Math.floor(
    airtime.toDate().getTime() / (1000.0 * 60 * AIRTIME_BLOCK_SIZE_MIN)
  );
}

function endOfMessageMoment(spin) {
  return moment(spin.airtime).add(spin.audioBlock.endOfMessageMS);
}

function lastAirtime(playlist) {
  return moment(playlist[playlist.length - 1].airtime);
}

function playlistEndMoment(playlist) {
  let lastSpin = playlist[playlist.length - 1];
  return moment(lastSpin.airtime).add(lastSpin.audioBlock.endOfMessageMS, "ms");
}

module.exports = {
  generatePlaylist,

  // expose for testing
  getAirtimeBlock,
  airtimeForSpin,
  msLeftInVoicetrack,
};
