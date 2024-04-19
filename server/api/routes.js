function addRoutes(app) {
  app.use('/v1/healthCheck', require('./healthCheck'));
}

module.exports = {
  addRoutes,
};
