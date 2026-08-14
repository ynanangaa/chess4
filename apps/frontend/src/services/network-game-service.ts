import {
  Color as EngineColor,
  type CapturedPiece,
  type Color,
  type Move,
  type PlayerStatus,
  type ReadonlyBoard,
} from '@chess4/engine';
import type { GameService } from './game-service';
import { isValidSquareId } from '../board/boardGeometry';

const PLAYER_ORDER: Color[] = [
  EngineColor.RED,
  EngineColor.BLUE,
  EngineColor.YELLOW,
  EngineColor.GREEN,
];

/** Mirrors apps/backend/src/protocol/messages.ts — kept in sync by hand for now. */
interface GameSnapshot {
  pieces: Array<{
    id: string;
    type: string;
    color: Color;
    points?: number;
    squareId: number;
    active: boolean;
  }>;
  currentPlayer: Color;
  isOver: boolean;
  statuses: Record<Color, PlayerStatus>;
  scores: Record<Color, number>;
  capturedPieces: CapturedPiece[];
  historyLength: number;
  legalMoves: Record<string, Move[]>;
}

/** Mirrors apps/backend/src/protocol/messages.ts — kept in sync by hand for now. */
interface RoomSnapshot {
  roomCode: string;
  occupiedSeats: Color[];
  hasStarted: boolean;
}

type ServerMessage =
  | { type: 'joined'; color: Color; roomCode: string }
  | { type: 'room'; snapshot: RoomSnapshot }
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'error'; message: string }
  | { type: 'roomFull' };

type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; roomCode: string }
  | { type: 'move'; move: Move }
  | { type: 'resign' }
  | { type: 'claimVictory' };

/**
 * Builds a `ReadonlyBoard`-shaped read-only view over a plain
 * {@link GameSnapshot}, so components that only ever consume
 * `GameService.getBoard()` (i.e. `Board.tsx`) work identically whether
 * the underlying source is a real local `Board` or data that arrived
 * over the wire.
 *
 * Only the methods `Board.tsx`/status components actually call are
 * implemented meaningfully; the rest throw, since a network client has
 * no legitimate reason to ever call them (e.g. `exportPieces`, which
 * exists on `ReadonlyBoard` only for engine-internal purposes).
 */
function boardFromSnapshot(snapshot: GameSnapshot | undefined): ReadonlyBoard {
  const bySquare = new Map(snapshot?.pieces.map(p => [p.squareId, p]) ?? []);
  const byId = new Map(snapshot?.pieces.map(p => [p.id, p]) ?? []);

  const notSupported = (name: string) => () => {
    throw new Error(`ReadonlyBoard.${name} is not supported on a network snapshot.`);
  };

  return {
    getConfig: () => 'CONFIG_1',
    getOccupiedSquares: () => new Map(Array.from(bySquare, ([sq, p]) => [sq, p.id])),
    getOccupiedSquaresByColor: (color) =>
      Array.from(bySquare)
        .filter(([, p]) => p.color === color)
        .map(([sq, p]) => [sq, p.id] as [number, string]),
    getPiece: (id) => {
      const p = byId.get(id);
      return p ? { id: p.id, type: p.type as never, color: p.color, points: p.points } : undefined;
    },
    getPieceAt: (squareId) => {
      const p = bySquare.get(squareId);
      return p ? { id: p.id, type: p.type as never, color: p.color, points: p.points } : undefined;
    },
    getPiecesByColor: (color) =>
      (snapshot?.pieces ?? [])
        .filter(p => p.color === color)
        .map(p => ({ id: p.id, type: p.type as never, color: p.color, points: p.points })),
    getSquareOf: (pieceId) => byId.get(pieceId)?.squareId,
    getKingSquare: (color) =>
      (snapshot?.pieces ?? []).find(p => p.color === color && p.type === 'K')?.squareId,
    isOccupied: (squareId) => bySquare.has(squareId),
    isValidSquare: (id) => isValidSquareId(id),
    isPieceActive: (pieceId) => byId.get(pieceId)?.active ?? true,
    exportPieces: notSupported('exportPieces'),
    toString: () => JSON.stringify(snapshot?.pieces ?? []),
  };
}

/**
 * Networked counterpart to `gameService`, conforming to the exact same
 * {@link GameService} shape so `App` and every status component work
 * unmodified regardless of which one is in use.
 *
 * Unlike the local service, this one holds no real engine `Game` at
 * all — only the most recent {@link GameSnapshot} and {@link RoomSnapshot}
 * broadcast by the server, which together are the sole source of truth.
 * Every "mutating" method here only *sends a request*; the resulting
 * state change (if any) arrives asynchronously as a `state`/`room`
 * message and is what actually triggers a re-render (see `notify()`)
 *
 * @remarks
 * `isValidSquare`/`exportPieces` on the returned board are intentionally
 * unimplemented (see `boardFromSnapshot`) — nothing in the current UI
 * calls them on a `ReadonlyBoard` obtained this way. `Board.tsx` derives
 * board *shape* (which squares are playable at all) independently, via
 * `buildAllSquares`, not from the engine at all — worth double-checking
 * if that ever changes.
 */
function createNetworkGameService() {
  let socket: WebSocket | undefined;
  let snapshot: GameSnapshot | undefined;
  let roomSnapshot: RoomSnapshot | undefined;
  let myColor: Color | undefined;
  let roomCode: string | undefined;
  let lastError: string | undefined;
  let version = 0;

  const listeners = new Set<() => void>();

  function notify(): void {
    version += 1;
    for (const listener of listeners) listener();
  }

  function send(message: ClientMessage): void {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  function connect(url: string, onOpen: () => void): void {
    socket = new WebSocket(url);

    socket.addEventListener('open', onOpen);

    socket.addEventListener('message', event => {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'joined':
          myColor = message.color;
          roomCode = message.roomCode;
          break;
        case 'room':
          roomSnapshot = message.snapshot;
          break;
        case 'state':
          snapshot = message.snapshot;
          break;
        case 'error':
          lastError = message.message;
          break;
        case 'roomFull':
          lastError = 'Room is full.';
          break;
      }

      notify();
    });

    socket.addEventListener('close', () => {
      lastError = 'Disconnected from server.';
      notify();
    });
  }

  return {
    // ── Connection lifecycle (not part of GameService — used by a
    // lobby/join screen before this service is handed to the game UI) ──

    createRoom(url: string): void {
      connect(url, () => send({ type: 'create' }));
    },

    joinRoom(url: string, code: string): void {
      connect(url, () => send({ type: 'join', roomCode: code }));
    },

    disconnect(): void {
      socket?.close();
    },

    getMyColor(): Color | undefined {
      return myColor;
    },

    getRoomCode(): string | undefined {
      return roomCode;
    },

    /**
     * Colors currently occupied by a connected player, per the most
     * recent `room` broadcast. Empty until the first such broadcast
     * arrives (immediately after `joined`).
     */
    getOccupiedSeats(): Color[] {
      return roomSnapshot?.occupiedSeats ?? [];
    },

    /**
     * Whether every seat in the room has ever been filled — the signal
     * a lobby view should use to stop waiting and start rendering the
     * game. Gameplay messages are rejected server-side until this is
     * `true` (see `GameRoom.hasStarted`), so this should be checked
     * before ever calling `advanceTurn`/`resignPlayer`/`claimVictory`.
     */
    getHasStarted(): boolean {
      return roomSnapshot?.hasStarted ?? false;
    },

    getLastError(): string | undefined {
      return lastError;
    },

    // ── React integration ──────────────────────────────────────────

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot(): number {
      return version;
    },

    // ── GameService shape ───────────────────────────────────────────

    advanceTurn(move?: Move): boolean {
      if (!move || myColor === undefined) return false;
      send({ type: 'move', move });
      return true;
    },

    claimVictory(_player: Color): boolean {
      send({ type: 'claimVictory' });
      return true;
    },

    resignPlayer(_color: Color): void {
      send({ type: 'resign' });
    },

    timeOutPlayer(_color: Color): void {
      // No client-initiated timeout over the network; the server will
      // own timers in a future iteration. No-op for now.
    },

    startNewGame(): void {
      // Not meaningful for a networked room; a new game means creating
      // or joining a new room instead. No-op.
    },

    getBoard(): ReadonlyBoard {
      return boardFromSnapshot(snapshot);
    },
    getAllCapturedPieces(): CapturedPiece[] {
      return snapshot?.capturedPieces ?? [];
    },
    getCapturedPiece(id: string): CapturedPiece | undefined {
      return snapshot?.capturedPieces.find(p => p.id === id);
    },
    getHistory(): Move[] {
      return []; // full history isn't currently part of the snapshot
    },
    getCurrentPlayerColor(): Color {
      return snapshot?.currentPlayer ?? EngineColor.RED;
    },
    getPlayer(color: Color) {
      return {
        getId: () => color,
        getColor: () => color,
        getScore: () => snapshot?.scores[color] ?? 0,
      };
    },
    getPlayerStatus(color: Color): PlayerStatus {
      return (
        snapshot?.statuses[color] ?? {
          inCheck: false,
          checkmated: false,
          stalemated: false,
          resigned: false,
          timedOut: false,
        }
      );
    },
    getCurrentPositionCount(): number {
      return 0; // not exposed by the snapshot; not used outside the engine itself
    },
    getLegalMoves(_pieceId: string): Move[] {
      return snapshot?.legalMoves[_pieceId] ?? [];
    },
    getMoveClock(): number {
      return 0;
    },
    hasPieceMoved(_pieceId: string): boolean {
      return false;
    },
    isOver(): boolean {
      return snapshot?.isOver ?? false;
    },
    isPlayerActive(color: Color): boolean {
      const status = this.getPlayerStatus(color);
      return !status.checkmated && !status.stalemated && !status.resigned && !status.timedOut;
    },
    isPlayerInCheck(color: Color): boolean {
      return this.getPlayerStatus(color).inCheck;
    },
    isPlayerCheckMated(color: Color): boolean {
      return this.getPlayerStatus(color).checkmated;
    },
    isPlayerStalled(color: Color): boolean {
      return this.getPlayerStatus(color).stalemated;
    },
    isPlayerResignedOrTimedOut(color: Color): boolean {
      const status = this.getPlayerStatus(color);
      return status.resigned || status.timedOut;
    },
    getNextPlayerColor(previous: Color): Color {
      const index = PLAYER_ORDER.indexOf(previous);
      return PLAYER_ORDER[(index + 1) % PLAYER_ORDER.length];
    },
    rankPlayersByScore() {
      return [...PLAYER_ORDER]
        .map(color => this.getPlayer(color))
        .sort((a, b) => b.getScore() - a.getScore());
    },
  };
}

export const networkGameService = createNetworkGameService();

// Sanity check, dev-time only: fails to compile if the shape drifts
// from GameService.
const _shapeCheck: GameService = networkGameService;