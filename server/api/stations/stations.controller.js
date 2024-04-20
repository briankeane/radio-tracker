const lib = require('../../lib/lib');

async function createStation(req, res) {
  try {
    var station = await lib.createStation({
      name: req.body.name,
      streamUrl: req.body.streamUrl,
    });
    return res.status(201).json(station);
  } catch (err) {
    return res.status(500).json(err.message);
  }
}

async function pollStation(req, res) {
  console.log('------- here ----------');
  try {
    var station = await lib.getStation(req.params.stationId);
    if (!station) {
      return res.status(404).json({ errorMessage: 'Station not found' });
    }

    var poll = await lib.executePoll({ station });
    return res.status(201).json({ station, poll });
  } catch (err) {
    console.error(err);
    return res.status(500).json(err.message);
  }
}

module.exports = {
  createStation,
  pollStation,
};
