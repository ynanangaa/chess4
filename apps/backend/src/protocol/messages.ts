import type { CapturedPiece, Color, Move, PlayerStatus } from '@chess4/engine';

export type ClientMessage =
  | { type: 'create' }
  | { type: 'join'; roomCode: string }
  | { type: 'move'; move: Move }
  | { type: 'resign' }
  | { type: 'claimVictory' };

/**
 * Plain-data serialization of a {@link Game}, sent to every client in a
 * room after any state change. Rebuilt fresh from the real `Game` on
 * every broadcast rather than diffed — simplicity over bandwidth for a
 * 4-player board of this size.
 */
export interface GameSnapshot {
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
  /**
   * Legal moves for every one of the *current player's* pieces that has
   * at least one, keyed by piece id. Empty for every other color, and
   * entirely empty once the game is over.
   *
   * Computed fresh per broadcast rather than sent on request, so the
   * client never needs a separate round-trip just to preview legal
   * destinations before committing to a move (see `network-game-service.ts`).
   * There's no information-hiding concern in sending only the current
   * player's moves rather than everyone's — four-player chess is a
   * full-information game — this is purely to avoid computing and
   * transmitting moves nobody can currently act on.
   */
  legalMoves: Record<string, Move[]>;
}

/**
 * Plain-data serialization of a {@link GameRoom}'s seat occupancy,
 * broadcast whenever seats change (on join, and on a pre-start
 * disconnect). Kept separate from {@link GameSnapshot} since seat
 * occupancy is a property of the room, not of the underlying `Game` —
 * a `Game` has no concept of which of its four colors currently has a
 * human seated at it.
 */
export interface RoomSnapshot {
  roomCode: string;
  /** Colors currently occupied by a connected player, in canonical order. */
  occupiedSeats: Color[];
  /**
   * Whether every seat has ever been filled (see
   * {@link GameRoom.hasStarted}). Clients should treat this as the
   * signal to leave the lobby view and start rendering the board —
   * gameplay messages (`move`/`resign`/`claimVictory`) are rejected by
   * the server until this is `true`.
   */
  hasStarted: boolean;
}

export type ServerMessage =
  | { type: 'joined'; color: Color; roomCode: string }
  | { type: 'room'; snapshot: RoomSnapshot }
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'error'; message: string }
  | { type: 'roomFull' };