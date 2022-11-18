const moment = require("moment");

function logPlaylist(playlist, msg = "test") {
  console.log(`---------------------- ${msg} ---------------------------`);
  console.table(
    playlist.map((spin) => ({
      playlistPosition: spin.playlistPosition,
      title: spin.audioBlock.title,
      airtime: moment(spin.airtime).format("h:mm:ss"),
      audioUrl: spin.audioBlock.audioUrl,
      endOfMessageMS: spin.audioBlock.endOfMessageMS,
      beginningOfOutroMS: spin.audioBlock.beginningOfOutroMS,
      endOfIntroMS: spin.audioBlock.endOfIntroMS,
    }))
  );
}

function prettyPrintTime(date) {
  return moment(date).format("h:mm:ss");
}

module.exports = {
  logPlaylist,
  prettyPrintTime,
};
