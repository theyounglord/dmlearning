"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var connect = function () {
    console.log(process.env.MONGO_URI);
    return mongoose_1.default
        .connect(process.env.MONGO_URI)
        .then(function () {
        console.log("Connected to MongoDB");
    })
        .catch(function (err) {
        console.log("Failed to connect to MongoDB");
        console.log(err);
    });
};
exports.default = connect;
//# sourceMappingURL=db.js.map