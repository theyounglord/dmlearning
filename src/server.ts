import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import * as morgan from "morgan";
import signaling from "./signaling";
import { log, LogLevel } from "./log";
import Options from "./class/options";
import { reset as resetHandler } from "./class/httphandler";
import connect from "./db";
require("dotenv").config();

const cors = require("cors");

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();
  resetHandler(config.mode ?? "");

  // logging http access
  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }
  // const signal = require('./signaling');
  app.use(cors({ origin: "*" }));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  connect();
  app.get("/ws/config", (req, res) =>
    res.json({
      useWebSocket: config.type == "websocket",
      startupMode: config.mode,
      logging: config.logging,
    })
  );
  app.use("/signaling", signaling);
  app.use(express.static(path.join(__dirname, "../client/public")));
  app.use("/module", express.static(path.join(__dirname, "../client/src")));
  // app.use('/booking')
  app.get("/", (req, res) => {
    const indexPagePath: string = path.join(
      __dirname,
      "../client/public/index.html"
    );
    fs.access(indexPagePath, (err) => {
      if (err) {
        log(LogLevel.warn, `Can't find file ' ${indexPagePath}`);
        res.status(404).send(`Can't find file ${indexPagePath}`);
      } else {
        res.sendFile(indexPagePath);
      }
    });
  });
  return app;
};
