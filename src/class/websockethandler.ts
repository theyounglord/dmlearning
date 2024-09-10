import Offer from "./offer";
import Answer from "./answer";
import Candidate from "./candidate";
import { time } from "speakeasy";
import { uuidGenerator } from "../utils/uuid-generator";

let isPrivate: boolean;

// [{sessionId:[connectionId,...]}]
const clients: Map<WebSocket, Set<string>> = new Map<WebSocket, Set<string>>();

// [{connectionId:[sessionId1, sessionId2]}]
const connectionPair: Map<string, [WebSocket, WebSocket]> = new Map<
  string,
  [WebSocket, WebSocket]
>();

const getUniqueConnectionId = (): string => {
  return String(Math.floor(Math.random() * 10000));
};

function getOrCreateConnectionIds(session: WebSocket): Set<string> {
  let connectionIds: Set<string> | undefined = clients.get(session);
  if (!connectionIds) {
    connectionIds = new Set<string>();
    clients.set(session, connectionIds);
  }
  return connectionIds;
}

function reset(mode: string): void {
  isPrivate = mode === "private";
}

function add(ws: WebSocket): void {
  clients.set(ws, new Set<string>());
}

function remove(ws: WebSocket): void {
  const connectionIds = clients.get(ws);
  if (connectionIds) {
    connectionIds.forEach((connectionId) => {
      const pair = connectionPair.get(connectionId);
      if (pair) {
        const otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
        if (otherSessionWs) {
          otherSessionWs.send(
            JSON.stringify({ type: "disconnect", connectionId: connectionId })
          );
        }
        connectionPair.delete(connectionId);
      }
    });
  }
  clients.delete(ws);
}

function onConnect(ws: WebSocket, connectionId: string): void {
  let polite = true;
  if (!isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);

      if (pair && pair[0] != null && pair[1] != null) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: `${connectionId}: This connection id is already used.`,
          })
        );
        return;
      } else if (pair && pair[0] != null) {
        connectionPair.set(connectionId, [pair[0], ws]);
        polite = false;
      }
    } else {
      connectionPair.set(connectionId, [ws, null]);
      polite = false;
    }
  }

  const connectionIds = getOrCreateConnectionIds(ws);
  connectionIds.add(connectionId);
  const payload = {
    type: "connect",
    timestamp: Date.now(),
    connectionId: connectionId,
    transactionId: uuidGenerator(),
  };
  ws.send(JSON.stringify(payload));
}

function onCommunication(ws: WebSocket, message: any): void {
  const connectionIds = clients.get(ws);

  if (connectionIds) {
    connectionIds.forEach((connectionId) => {
      if (connectionId !== message.connectionId) {
        // Send message to all WebSockets associated with this connection ID except the sender
        clients.forEach((ids, client) => {
          if (ids.has(connectionId) && client !== ws) {
            client.send(
              JSON.stringify({
                type: "communication",
                connectionId: connectionId,
                data: message,
                command: {
                  cmdType: message.cmdType,
                  description: message.message,
                },
              })
            );
          }
        });
      } else {
        // Handle the case where the message is intended for the same connection ID
        const pair = connectionPair.get(connectionId);
        if (pair) {
          const otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
          if (otherSessionWs) {
            otherSessionWs.send(
              JSON.stringify({
                type: "communication",
                connectionId: connectionId,
                timestamp: Date.now(),
                transactionId: uuidGenerator(),
                command: {
                  cmdType: message.cmdType,
                  description: message.message,
                },
                data: {
                  connectionId: connectionId,
                  message: message.message,
                  username: message.username,
                },
              })
            );
          }
        }
      }
    });
  }
}

function onAknowledgement(ws: WebSocket, message: any): void {
  const connectionIds = clients.get(ws);
  if (connectionIds) {
    connectionIds.forEach((connectionId) => {
      clients.forEach((ids, client) => {
        if (ids.has(connectionId) && client !== ws) {
          client.send(
            JSON.stringify({
              type: "aknowledgement",
              connectionId: connectionId,
              data: message,
            })
          );
        }
      });
    });
  }
}

function onDisconnect(ws: WebSocket, connectionId: string): void {
  const connectionIds = clients.get(ws);
  if (connectionIds) {
    connectionIds.delete(connectionId);

    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);
      const otherSessionWs = pair && (pair[0] === ws ? pair[1] : pair[0]);
      if (otherSessionWs) {
        otherSessionWs.send(
          JSON.stringify({ type: "disconnect", connectionId: connectionId })
        );
        otherSessionWs.close(
          1000,
          `Connection ${connectionId} has been closed by the client`
        );
      }
      connectionPair.delete(connectionId);
    }
    ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
    ws.close(1000, `Connection ${connectionId} has been closed by the client`);
  }
}

function onOffer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const newOffer = new Offer(message.sdp, Date.now(), false);

  if (isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);
      const otherSessionWs = pair && (pair[0] === ws ? pair[1] : pair[0]);
      if (otherSessionWs) {
        newOffer.polite = true;
        otherSessionWs.send(
          JSON.stringify({
            from: connectionId,
            to: "",
            type: "offer",
            data: newOffer,
          })
        );
      }
    }
    return;
  }

  connectionPair.set(connectionId, [ws, null]);
  clients.forEach((_v, k) => {
    if (k !== ws) {
      k.send(
        JSON.stringify({
          from: connectionId,
          to: "",
          type: "offer",
          data: newOffer,
        })
      );
    }
  });
}

function onAnswer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const connectionIds = getOrCreateConnectionIds(ws);
  connectionIds.add(connectionId);
  const newAnswer = new Answer(message.sdp, Date.now());

  if (!connectionPair.has(connectionId)) {
    return;
  }

  const pair = connectionPair.get(connectionId);
  const otherSessionWs =
    (pair && ((pair[0] === ws ? pair[1] : pair[0]) as WebSocket)) || null;

  if (!isPrivate) {
    connectionPair.set(connectionId, [otherSessionWs, ws]);
  }

  if (otherSessionWs) {
    otherSessionWs.send(
      JSON.stringify({
        from: connectionId,
        to: "",
        type: "answer",
        data: newAnswer,
      })
    );
  }
}

function onCandidate(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId;
  const candidate = new Candidate(
    message.candidate,
    message.sdpMLineIndex,
    message.sdpMid,
    Date.now()
  );

  if (isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);
      const otherSessionWs = pair[0] === ws ? pair[1] : pair[0];
      if (otherSessionWs) {
        otherSessionWs.send(
          JSON.stringify({
            from: connectionId,
            to: "",
            type: "candidate",
            data: candidate,
          })
        );
      }
    }
    return;
  }

  clients.forEach((_v, k) => {
    if (k !== ws) {
      k.send(
        JSON.stringify({
          from: connectionId,
          to: "",
          type: "candidate",
          data: candidate,
        })
      );
    }
  });
}

export {
  reset,
  add,
  remove,
  onConnect,
  onDisconnect,
  onOffer,
  getUniqueConnectionId,
  onAnswer,
  onCommunication,
  onAknowledgement,
  onCandidate,
};
