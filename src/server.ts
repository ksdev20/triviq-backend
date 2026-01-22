import http from "http";
import express from "express";
import { Server } from "socket.io";
import { CONFIG } from "./config.js";
import { RoomStore } from "./core/roomStore.js";
import { GameEngine } from "./core/gameEngine.js";
import { registerSocketHandlers } from "./core/socketHandlers.js";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "./types.js";
import { log } from "./utils/logger.js";

const app = express();
app.get("/health", (req, res) => {
  return res.status(200).json({ ok: true });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {origin: CONFIG.corsOrigin},
    transports: ["websocket", "polling"],
    serveClient: false,
});

const store = new RoomStore;
const engine = new GameEngine(store);

registerSocketHandlers(io, store, engine);

server.listen(CONFIG.port, () => {
    log('info', 'server_started', {port: CONFIG.port})
})