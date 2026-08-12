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
}

export type ServerMessage =
  | { type: 'joined'; color: Color; roomCode: string }
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'error'; message: string }
  | { type: 'roomFull' };