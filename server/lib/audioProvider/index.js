/*
 * Stub
 */

class AudioProvider {
  getDataForSong() {
    // for now you just get a url with Rachel's longest song.
    return Promise.resolve({
      audioUrl:
        "https://playolasongs.s3.us-west-2.amazonaws.com/-pl-0000012-Rachel-Loy-Fade-to-Gray.mp3",
    });
  }
}

const instance = new AudioProvider();
module.exports = instance;
