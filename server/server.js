import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import bearerToken from "express-bearer-token";
import http from "http";
import addRoutes from "./api/routes.js";
import morgan from "morgan";
import { sequelize } from "./db";

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

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

Promise.all([sequelize.sync()]).then(() => {
  app.isReady = true;
  app.emit("READY");
});

const server = http.createServer(app);
addRoutes(app);

server.listen(port);
