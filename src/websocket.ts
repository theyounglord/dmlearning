import * as websocket from "ws";
import { Server } from "http";
import * as handler from "./class/websockethandler";
import websocketLogSchema from "./model/websocketlogs.model";
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
      let deviceId = '';
      let isDashboard = false;

      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);

        // Handle device connection
        if (msg.type === 'deviceConnect') {
          deviceId = msg.deviceId;
          handler.addClientToRoom(ws, deviceId);

          // Mark device as online and broadcast to the dashboard, including initial battery health
          handler.broadcastToDashboard({
            type: 'statusUpdate',
            deviceId: deviceId,
            status: 'online',
            batteryHealth: msg.batteryHealth || 'unknown'
          });
        }

        // Handle battery health updates
        if (msg.type === 'batteryHealth') {
          // Mark the device as online if it's sending battery updates
          handler.broadcastToDashboard({
            type: 'statusUpdate',
            deviceId: deviceId,
            status: 'online',
            batteryHealth: msg.batteryHealth
          });
        }

        // Handle dashboard connection
        if (msg.type === 'dashboardConnect') {
          isDashboard = true;
          handler.setDashboardClient(ws);

          // Send all devices' status on first dashboard connection
          const roomClients = handler.getRoomClients();
          roomClients.forEach((_ws, id) => {
            handler.broadcastToDashboard({
              type: 'statusUpdate',
              deviceId: id,
              status: 'online',
              batteryHealth: 'unknown', // Placeholder for real data
            });
          });
        }
      };

      // Handle disconnection
      ws.onclose = () => {
        if (isDashboard) {
          console.log("Dashboard client disconnected.");
        } else {
          handler.removeClientFromRoom(deviceId);
          handler.broadcastToDashboard({
            type: 'statusUpdate',
            deviceId: deviceId,
            status: 'offline'
          });
        }
      };
    });
  }
}