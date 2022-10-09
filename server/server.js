const bodyParser = require("body-parser");
const compression = require("compression");
const express = require("express");
const bearerToken = require("express-bearer-token");
const http = require("http");
const { addRoutes } = require("./api/routes.js");
const morgan = require("morgan");
const { sequelize } = require("./db");

const port = process.env.PORT || 3000;
const app = express();

app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization"
  );
  if ("OPTIONS" === req.method) {
    res.status(200).end();
  } else {
    next();
  }
});

app.use(bearerToken());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.isReadyPromise = new Promise((resolve, reject) => {
  return Promise.all([sequelize.sync()])
    .then(() => {
      return resolve();
    })
    .catch((err) => console.log(err));
});

const server = http.createServer(app);
addRoutes(app);

if (require.main === module) {
  server.listen(port);
}

exports = module.exports = app;
