import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Color } from '@chess4/engine';
import { GameRegistry } from './game-registry';
import { buildTrainingTensors } from './rl/tensor-encoder';
import { packStateFrame, type StateHeader, type StateHeaderGame } from './rl/frame';

const PLAYER_COLORS: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

type ClientControl =
  | { type: 'create'; count: number }
  | { type: 'reset'; ids: string[] }
  | { type: 'step'; moves: Array<{ gameId: string; pieceId: string; from: number; to: number }> }
  | { type: 'close' };

const server = http.createServer();
const wss = new WebSocketServer({ server });
const registry = new GameRegistry();

function send(socket: WebSocket, message: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

/**
 * Builds and sends a binary `state` frame for exactly the given game
 * ids, in that order. Unknown ids are silently skipped — a defensive
 * choice given this server has no session/ownership model to enforce
 * which ids a given socket "should" know about (see class docs on
 * `GameRegistry`).
 */
function sendState(socket: WebSocket, ids: string[]): void {
  const buffers: Float32Array[] = [];
  let offset = 0;
  const games: StateHeaderGame[] = [];

  for (const gameId of ids) {
    const game = registry.getGame(gameId);
    if (!game) continue;

    const scores = Object.fromEntries(
      PLAYER_COLORS.map(color => [color, game.getPlayer(color).getScore()])
    ) as Record<Color, number>;

    const statuses = Object.fromEntries(
      PLAYER_COLORS.map(color => [color, game.getPlayerStatus(color)])
    ) as Record<Color, import('@chess4/engine').PlayerStatus>;

    if (game.isOver()) {
      games.push({
        gameId,
        currentPlayer: game.getCurrentPlayerColor(),
        isOver: true,
        scores,
        statuses,
        moveCount: 0,
        moveMeta: [],
        planesOffset: -1,
        globalVectorOffset: -1,
        moveFeaturesOffset: -1,
      });
      continue;
    }

    const perspective = game.getCurrentPlayerColor();
    const tensors = buildTrainingTensors(game, perspective);

    const planesOffset = offset;
    buffers.push(tensors.planes);
    offset += tensors.planes.length;

    const globalVectorOffset = offset;
    buffers.push(tensors.globalVector);
    offset += tensors.globalVector.length;

    const moveFeaturesOffset = offset;
    buffers.push(tensors.moveFeatures);
    offset += tensors.moveFeatures.length;

    games.push({
      gameId,
      currentPlayer: perspective,
      isOver: false,
      scores,
      statuses,
      moveCount: tensors.moveCount,
      moveMeta: tensors.moveMeta,
      planesOffset,
      globalVectorOffset,
      moveFeaturesOffset,
    });
  }

  const header: StateHeader = { type: 'state', games };
  socket.send(packStateFrame(header, buffers));
}

wss.on('connection', socket => {
  socket.on('message', raw => {
    let message: ClientControl;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: 'error', message: 'Malformed message.' });
      return;
    }

    switch (message.type) {
      case 'create': {
        const count = Math.max(1, Number(message.count) || 1);
        const ids = Array.from({ length: count }, () => registry.createGame());
        send(socket, { type: 'created', ids });
        return;
      }

      case 'reset': {
        for (const id of message.ids) registry.resetGame(id);
        sendState(socket, message.ids);
        return;
      }

      case 'step': {
        for (const { gameId, pieceId, from, to } of message.moves) {
          const game = registry.getGame(gameId);
          if (!game) continue;

          // Trust boundary matches RuleSet.applyMove: only pieceId/from/to
          // are ever read here; the engine resolves capture/castle/
          // pawnSpecialMove itself and ignores anything else supplied.
          game.advanceTurn({ pieceId, from, to });
        }

        sendState(socket, message.moves.map(m => m.gameId));
        return;
      }

      case 'close':
        socket.close();
        return;
    }
  });
});

const PORT = Number(process.env.PORT) || 4100;
server.listen(PORT, () => {
  console.log(`chess4 training server listening on port ${PORT}`);
});