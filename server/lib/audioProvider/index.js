/*
 * Stub
 */

let songs = [
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/Wildflowers.m4a",
    durationMS: 184500,
    endOfIntroMS: 11000,
    beginningOfOutroMS: 183500,
    endOfMessageMS: 183500,
  },
  {
    audioUrl:
      "https://playola-temp-songs.s3.amazonaws.com/YouDontKnowHowItFeels.m4a",
    durationMS: 281000,
    endOfIntroMS: 17000,
    beginningOfOutroMS: 258000,
    endOfMessageMS: 281000,
  },
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/Walls.m4a",
    durationMS: 240000,
    endOfIntroMS: 12000,
    beginningOfOutroMS: 208000,
    endOfMessageMS: 240000,
  },
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/Refugee.m4a",
    durationMS: 190000,
    endOfIntroMS: 17000,
    beginningOfOutroMS: 175000,
    endOfMessageMS: 190000,
  },
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/HereComesMyGirl.m4a",
    durationMS: 223000,
    endOfIntroMS: 21000,
    beginningOfOutroMS: 210000,
    endOfMessageMS: 223000,
  },
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/TheWaiting.m4a",
    durationMS: 209000,
    endOfIntroMS: 18000,
    beginningOfOutroMS: 189000,
    endOfMessageMS: 209000,
  },
  {
    audioUrl: "https://playola-temp-songs.s3.amazonaws.com/IWontBackDown.m4a",
    durationMS: 0,
    endOfIntroMS: 8500,
    beginningOfOutroMS: 173000,
    endOfMessageMS: 173000,
  },
];
class AudioProvider {
  constructor() {
    this.count = 0;
  }

  getDataForSong() {
    // for now you just get a url with Rachel's longest song.
    this.count++;
    if (this.count === songs.length) {
      this.count = 0;
    }
    return Promise.resolve(songs[this.count]);
  }
}

const instance = new AudioProvider();
module.exports = instance;
