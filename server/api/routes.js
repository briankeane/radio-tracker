function addRoutes(app) {
  app.use("/v1/healthCheck", require("./healthCheck"));
  app.use("/v1/auth", require("./auth"));
  app.use("/v1/users", require("./user"));
}

module.exports = {
  addRoutes,
};
