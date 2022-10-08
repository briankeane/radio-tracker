function index(req, res) {
  return res.status(200).json({ healthy: true });
}

module.exports = {
  index,
};
