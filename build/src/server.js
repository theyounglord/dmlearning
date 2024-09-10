"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var fs = require("fs");
var morgan = require("morgan");
var signaling_1 = require("./signaling");
var log_1 = require("./log");
var httphandler_1 = require("./class/httphandler");
var db_1 = require("./db");
require("dotenv").config();
var cors = require("cors");
exports.createServer = function (config) {
    var _a;
    var app = express();
    httphandler_1.reset((_a = config.mode) !== null && _a !== void 0 ? _a : "");
    // logging http access
    if (config.logging != "none") {
        app.use(morgan(config.logging));
    }
    // const signal = require('./signaling');
    app.use(cors({ origin: "*" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    db_1.default();
    app.get("/ws/config", function (req, res) {
        return res.json({
            useWebSocket: config.type == "websocket",
            startupMode: config.mode,
            logging: config.logging,
        });
    });
    app.use("/signaling", signaling_1.default);
    app.use(express.static(path.join(__dirname, "../client/public")));
    app.use("/module", express.static(path.join(__dirname, "../client/src")));
    // app.use('/booking')
    app.get("/", function (req, res) {
        var indexPagePath = path.join(__dirname, "../client/public/index.html");
        fs.access(indexPagePath, function (err) {
            if (err) {
                log_1.log(log_1.LogLevel.warn, "Can't find file ' " + indexPagePath);
                res.status(404).send("Can't find file " + indexPagePath);
            }
            else {
                res.sendFile(indexPagePath);
            }
        });
    });
    return app;
};
//# sourceMappingURL=server.js.map