"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var offer_1 = require("./offer");
var answer_1 = require("./answer");
var candidate_1 = require("./candidate");
var uuid_generator_1 = require("../utils/uuid-generator");
var isPrivate;
// [{sessionId:[connectionId,...]}]
var clients = new Map();
// [{connectionId:[sessionId1, sessionId2]}]
var connectionPair = new Map();
var getUniqueConnectionId = function () {
    return String(Math.floor(Math.random() * 10000));
};
exports.getUniqueConnectionId = getUniqueConnectionId;
function getOrCreateConnectionIds(session) {
    var connectionIds = clients.get(session);
    if (!connectionIds) {
        connectionIds = new Set();
        clients.set(session, connectionIds);
    }
    return connectionIds;
}
function reset(mode) {
    isPrivate = mode === "private";
}
exports.reset = reset;
function add(ws) {
    clients.set(ws, new Set());
}
exports.add = add;
function remove(ws) {
    var connectionIds = clients.get(ws);
    if (connectionIds) {
        connectionIds.forEach(function (connectionId) {
            var pair = connectionPair.get(connectionId);
            if (pair) {
                var otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
                if (otherSessionWs) {
                    otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
                }
                connectionPair.delete(connectionId);
            }
        });
    }
    clients.delete(ws);
}
exports.remove = remove;
function onConnect(ws, connectionId) {
    var polite = true;
    if (!isPrivate) {
        if (connectionPair.has(connectionId)) {
            var pair = connectionPair.get(connectionId);
            if (pair && pair[0] != null && pair[1] != null) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: connectionId + ": This connection id is already used.",
                }));
                return;
            }
            else if (pair && pair[0] != null) {
                connectionPair.set(connectionId, [pair[0], ws]);
                polite = false;
            }
        }
        else {
            connectionPair.set(connectionId, [ws, null]);
            polite = false;
        }
    }
    var connectionIds = getOrCreateConnectionIds(ws);
    connectionIds.add(connectionId);
    var payload = {
        type: "connect",
        timestamp: Date.now(),
        connectionId: connectionId,
        transactionId: uuid_generator_1.uuidGenerator(),
    };
    ws.send(JSON.stringify(payload));
}
exports.onConnect = onConnect;
function onCommunication(ws, message) {
    var connectionIds = clients.get(ws);
    if (connectionIds) {
        connectionIds.forEach(function (connectionId) {
            if (connectionId !== message.connectionId) {
                // Send message to all WebSockets associated with this connection ID except the sender
                clients.forEach(function (ids, client) {
                    if (ids.has(connectionId) && client !== ws) {
                        client.send(JSON.stringify({
                            type: "communication",
                            connectionId: connectionId,
                            data: message,
                            command: {
                                cmdType: message.cmdType,
                                description: message.message,
                            },
                        }));
                    }
                });
            }
            else {
                // Handle the case where the message is intended for the same connection ID
                var pair = connectionPair.get(connectionId);
                if (pair) {
                    var otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
                    if (otherSessionWs) {
                        otherSessionWs.send(JSON.stringify({
                            type: "communication",
                            connectionId: connectionId,
                            timestamp: Date.now(),
                            transactionId: uuid_generator_1.uuidGenerator(),
                            command: {
                                cmdType: message.cmdType,
                                description: message.message,
                            },
                            data: {
                                connectionId: connectionId,
                                message: message.message,
                                username: message.username,
                            },
                        }));
                    }
                }
            }
        });
    }
}
exports.onCommunication = onCommunication;
function onAknowledgement(ws, message) {
    var connectionIds = clients.get(ws);
    if (connectionIds) {
        connectionIds.forEach(function (connectionId) {
            clients.forEach(function (ids, client) {
                if (ids.has(connectionId) && client !== ws) {
                    client.send(JSON.stringify({
                        type: "aknowledgement",
                        connectionId: connectionId,
                        data: message,
                    }));
                }
            });
        });
    }
}
exports.onAknowledgement = onAknowledgement;
function onDisconnect(ws, connectionId) {
    var connectionIds = clients.get(ws);
    if (connectionIds) {
        connectionIds.delete(connectionId);
        if (connectionPair.has(connectionId)) {
            var pair = connectionPair.get(connectionId);
            var otherSessionWs = pair && (pair[0] === ws ? pair[1] : pair[0]);
            if (otherSessionWs) {
                otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
                otherSessionWs.close(1000, "Connection " + connectionId + " has been closed by the client");
            }
            connectionPair.delete(connectionId);
        }
        ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
        ws.close(1000, "Connection " + connectionId + " has been closed by the client");
    }
}
exports.onDisconnect = onDisconnect;
function onOffer(ws, message) {
    var connectionId = message.connectionId;
    var newOffer = new offer_1.default(message.sdp, Date.now(), false);
    if (isPrivate) {
        if (connectionPair.has(connectionId)) {
            var pair = connectionPair.get(connectionId);
            var otherSessionWs = pair && (pair[0] === ws ? pair[1] : pair[0]);
            if (otherSessionWs) {
                newOffer.polite = true;
                otherSessionWs.send(JSON.stringify({
                    from: connectionId,
                    to: "",
                    type: "offer",
                    data: newOffer,
                }));
            }
        }
        return;
    }
    connectionPair.set(connectionId, [ws, null]);
    clients.forEach(function (_v, k) {
        if (k !== ws) {
            k.send(JSON.stringify({
                from: connectionId,
                to: "",
                type: "offer",
                data: newOffer,
            }));
        }
    });
}
exports.onOffer = onOffer;
function onAnswer(ws, message) {
    var connectionId = message.connectionId;
    var connectionIds = getOrCreateConnectionIds(ws);
    connectionIds.add(connectionId);
    var newAnswer = new answer_1.default(message.sdp, Date.now());
    if (!connectionPair.has(connectionId)) {
        return;
    }
    var pair = connectionPair.get(connectionId);
    var otherSessionWs = (pair && (pair[0] === ws ? pair[1] : pair[0])) || null;
    if (!isPrivate) {
        connectionPair.set(connectionId, [otherSessionWs, ws]);
    }
    if (otherSessionWs) {
        otherSessionWs.send(JSON.stringify({
            from: connectionId,
            to: "",
            type: "answer",
            data: newAnswer,
        }));
    }
}
exports.onAnswer = onAnswer;
function onCandidate(ws, message) {
    var connectionId = message.connectionId;
    var candidate = new candidate_1.default(message.candidate, message.sdpMLineIndex, message.sdpMid, Date.now());
    if (isPrivate) {
        if (connectionPair.has(connectionId)) {
            var pair = connectionPair.get(connectionId);
            var otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
            if (otherSessionWs) {
                otherSessionWs.send(JSON.stringify({
                    from: connectionId,
                    to: "",
                    type: "candidate",
                    data: candidate,
                }));
            }
        }
        return;
    }
    clients.forEach(function (_v, k) {
        if (k !== ws) {
            k.send(JSON.stringify({
                from: connectionId,
                to: "",
                type: "candidate",
                data: candidate,
            }));
        }
    });
}
exports.onCandidate = onCandidate;
//# sourceMappingURL=websockethandler.js.map