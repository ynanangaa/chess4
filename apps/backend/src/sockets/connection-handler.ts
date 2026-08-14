import type { WebSocket, WebSocketServer } from 'ws';
import type { Color } from '@chess4/engine';
import { GameRoom } from '../rooms/game-room';
import { RoomManager } from '../rooms/room-manager';
import type { ClientMessage, ServerMessage } from '../protocol/messages';
import { buildRoomSnapshot, buildSnapshot } from '../protocol/snapshot';

interface SocketMeta {
  roomCode: string;
  color: Color;
}

/**
 * Wires raw WebSocket connections to room/game logic.
 *
 * A socket's room/color is recorded only once a `create`/`join` message
 * succeeds, in a private map local to this function. Every later
 * message from that socket is authorized against *that* stored color —
 * a client has no way to act as any seat other than the one it was
 * actually assigned, regardless of what a message claims.
 */
export function attachConnectionHandler(wss: WebSocketServer, rooms: RoomManager): void {
  const socketMeta = new WeakMap<WebSocket, SocketMeta>();
  const roomSockets = new Map<string, Set<WebSocket>>();

  function send(socket: WebSocket, message: ServerMessage): void {
    socket.send(JSON.stringify(message));
  }

function broadcastMessage(roomCode: string, message: ServerMessage): void {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return;

  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

function broadcastGameState(roomCode: string, room: GameRoom): void {
  broadcastMessage(roomCode, { type: 'state', snapshot: buildSnapshot(room.getGame()) });
}

function broadcastRoomState(roomCode: string, room: GameRoom): void {
  broadcastMessage(roomCode, { type: 'room', snapshot: buildRoomSnapshot(room) });
}

/**
 * Rejects a gameplay message (`move`/`resign`/`claimVictory`) sent
 * before every seat has ever been filled. Necessary because `Game`
 * itself has no notion of "unseated" colors — all four are equally
 * playable from the engine's point of view regardless of whether a
 * human is actually connected to them — so this boundary is the only
 * place that can enforce it.
 */
function requireStarted(room: GameRoom, socket: WebSocket): boolean {
  if (!room.hasStarted()) {
    send(socket, { type: 'error', message: 'Game has not started yet.' });
    return false;
  }
  return true;
}

  function registerSocket(socket: WebSocket, roomCode: string): void {
    if (!roomSockets.has(roomCode)) roomSockets.set(roomCode, new Set());
    roomSockets.get(roomCode)!.add(socket);
  }

  function unregisterSocket(socket: WebSocket, roomCode: string): void {
    roomSockets.get(roomCode)?.delete(socket);
  }

  wss.on('connection', socket => {
    socket.on('message', raw => {
      let message: ClientMessage;

      try {
        message = JSON.parse(raw.toString());
      } catch {
        send(socket, { type: 'error', message: 'Malformed message.' });
        return;
      }

      const meta = socketMeta.get(socket);

      if (message.type === 'create' || message.type === 'join') {
        if (meta) {
          send(socket, { type: 'error', message: 'Already joined a room.' });
          return;
        }

        const room =
          message.type === 'create'
            ? rooms.createRoom()
            : rooms.getRoom(message.roomCode);

        if (!room) {
          send(socket, { type: 'error', message: 'Room not found.' });
          return;
        }

        const color = room.assignSeat();
        if (color === undefined) {
          send(socket, { type: 'roomFull' });
          return;
        }

        socketMeta.set(socket, { roomCode: room.code, color });
        registerSocket(socket, room.code);

        send(socket, { type: 'joined', color, roomCode: room.code });
        broadcastRoomState(room.code, room);
        broadcastGameState(room.code, room);
        return;
      }

      if (!meta) {
        send(socket, { type: 'error', message: 'Join a room first.' });
        return;
      }

      const room = rooms.getRoom(meta.roomCode);
      if (!room) return;

      switch (message.type) {
        case 'move': {
          if (!requireStarted(room, socket)) return;

          if (room.getGame().getCurrentPlayerColor() !== meta.color) {
            send(socket, { type: 'error', message: 'Not your turn.' });
            return;
          }

          const applied = room.getGame().advanceTurn(message.move);
          if (!applied) {
            send(socket, { type: 'error', message: 'Illegal move.' });
            return;
          }

          broadcastGameState(meta.roomCode, room);
          return;
        }

        case 'resign': {
          if (!requireStarted(room, socket)) return;
          if (!room.getGame().isPlayerActive(meta.color)) return;

          room.getGame().resignPlayer(meta.color);
          broadcastGameState(meta.roomCode, room);
          return;
        }

        case 'claimVictory': {
          if (!requireStarted(room, socket)) return;

          const claimed = room.getGame().claimVictory(meta.color);
          if (!claimed) {
            send(socket, { type: 'error', message: 'Cannot claim victory.' });
            return;
          }

          broadcastGameState(meta.roomCode, room);
          return;
        }
      }
    });

    socket.on('close', () => {
      const meta = socketMeta.get(socket);
      if (!meta) return;

      unregisterSocket(socket, meta.roomCode);

      const room = rooms.getRoom(meta.roomCode);
      if (!room) return;

      const wasStarted = room.hasStarted();
      room.handleDisconnect(meta.color);

      const remainingSockets = roomSockets.get(meta.roomCode);
      const noOneConnected = !remainingSockets || remainingSockets.size === 0;

      if (noOneConnected) {
        rooms.removeRoom(meta.roomCode);
        return;
      }

      if (wasStarted) {
        broadcastGameState(meta.roomCode, room);
      } else {
        broadcastRoomState(meta.roomCode, room);
      }
    });
  });
}