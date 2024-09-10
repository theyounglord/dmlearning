"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose = require("mongoose");
var websocketLogSchema = new mongoose.Schema({
    type: {
        type: String,
        default: null,
    },
    connectionId: {
        type: String,
        default: null,
    },
    timestamp: {
        type: Number,
        default: null,
    },
    transactionId: {
        type: String,
        default: null,
    },
    data: {
        type: Object,
    },
    command: {
        cmdType: {
            type: Number,
            default: null,
        },
        description: {
            type: String,
            default: null,
        },
    },
}, {
    timestamps: true,
});
//  create module
exports.default = mongoose.model("websocketlogs", websocketLogSchema);
//# sourceMappingURL=websocketlogs.model.js.map