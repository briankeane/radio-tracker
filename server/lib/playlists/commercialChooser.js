const db = require("../../db");

const commercialsUrl =
  "https://playolacommercialblocks.s3.us-west-2.amazonaws.com";
const COMMERCIALS_COUNT = 27;

function audioUrlForIndex(index) {
  let indexStr = String(index).padStart(4, "0");
  return `${commercialsUrl}/${indexStr}_commercial_block.mp3`;
}

class CommercialChooser {
  async chooseCommercial() {
    // for now we're just going to show a random one
    let minimum = 1,
      maximum = COMMERCIALS_COUNT;
    let index = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    let audioUrl = audioUrlForIndex(index);

    // creates the commercial if it doesn't exist in the db
    let result = await db.models.Commercial.findOrCreate({
      where: { audioUrl },
      defaults: { title: "Commercial", artist: "------", durationMS: 180000 },
    });
    return result[0];
  }
}

module.exports = CommercialChooser;
