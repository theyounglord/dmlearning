import * as websocket from "ws";
import { Server } from "http";
import * as handler from "./class/websockethandler";
import websocketLogSchema from "./model/websocketlogs.model";
import { time } from "speakeasy";
import { uuidGenerator } from "./utils/uuid-generator";

export default class WSSignaling {
  server: Server;
  wss: websocket.Server;

  constructor(server: Server, mode: string) {
    this.server = server;
    this.wss = new websocket.Server({
      server,
      path: "/ws",
    });

    handler.reset(mode);

    this.wss.on("connection", async (ws: WebSocket) => {
      // get unique connection id

      ws.send(
        JSON.stringify({
          type: "init",
          transactionId: uuidGenerator(),
          timestamp: Date.now(),
        })
      );
      handler.add(ws);

      ws.onclose = (): void => {
        handler.remove(ws);
      };

      ws.onmessage = async (event: MessageEvent) => {
        // type: connect, disconnect JSON Schema
        // connectionId: connect or disconnect connectionId

        // type: offer, answer, candidate JSON Schema
        // from: from connection id
        // to: to connection id
        // data: any message data structure

        const msg = JSON.parse(event.data);
        if (!msg || !this) {
          return;
        }

        console.log("msg", msg);

        const dbLogs = new websocketLogSchema({
          transactionId: msg.transactionId,
        });

        for (const key in msg) {
          dbLogs[key] = msg[key];
        }
        await dbLogs.save();

        switch (msg.type) {
          case "connect":
            handler.onConnect(ws, msg.connectionId);
            break;
          case "communication":
            handler.onCommunication(ws, msg.data);
            break;
          case "aknowledgement":
            handler.onAknowledgement(ws, msg.data);
            break;
          case "disconnect":
            handler.onDisconnect(ws, msg.connectionId);
            break;
          case "offer":
            handler.onOffer(ws, msg.data);
            break;
          case "answer":
            handler.onAnswer(ws, msg.data);
            break;
          case "candidate":
            handler.onCandidate(ws, msg.data);
            break;
          default:
            break;
        }
      };
    });
  }
}
