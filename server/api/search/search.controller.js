const lib = require('../../lib/lib');

async function index(req, res) {
  const response = await lib.searchFromMetadata(req.query.term);
  console.log('term: ', req.query.term);
  console.log(response.data);
  return res.status(200).json(response);
}

async function nowPlaying(req, res) {
  const response = await lib.getNowPlayingForUrl(req.query.searchUrl);
  console.log(response);
  return res.status(200).json(response);
}

module.exports = {
  index,
  nowPlaying,
};
