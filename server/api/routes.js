function addRoutes(app) {
  app.use('/v1/healthCheck', require('./healthCheck'));
  app.use('/v1/auth', require('./auth'));
  app.use('/v1/users', require('./user'));
  app.use('/v1/spins', require('./spin'));
  app.use('/v1/voiceTracks', require('./voiceTrack'));
  app.use('/v1/songs', require('./song'));
}

module.exports = {
  addRoutes,
};
