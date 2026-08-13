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

export type ServerMessage =
  | { type: 'joined'; color: Color; roomCode: string }
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'error'; message: string }
  | { type: 'roomFull' };