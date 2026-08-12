import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { RoomManager } from './rooms/room-manager';
import { attachConnectionHandler } from './sockets/connection-handler';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new RoomManager();
attachConnectionHandler(wss, rooms);

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`chess4 backend listening on port ${PORT}`);
});