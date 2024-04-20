function addRoutes(app) {
  app.use('/v1/healthCheck', require('./healthCheck'));
  app.use('/v1/search', require('./search'));
  app.use('/v1/stations', require('./stations'));
}

module.exports = {
  addRoutes,
};
