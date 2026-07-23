import { Color } from "./color";
import { PieceType } from "./piece-type";

/**
 * A chess piece on the board.
 *
 * `Piece` objects are treated as **immutable** throughout the codebase —
 * any state change (activation, promotion, etc.) produces a new `Piece`
 * object rather than mutating the existing one. This invariant is relied
 * upon by {@link Board.clone} for safe shallow cloning.
 */
export interface Piece {
  /**
   * Whether the piece is currently in play. A piece becomes inactive when
   * its owning player is eliminated from the game (see
   * {@link Board.setPlayerPiecesInactive}), as distinct from being
   * captured/removed from the board entirely.
   */
  active: boolean;

  /**
   * Stable, unique identifier for this piece (e.g. `"K-red"`). Certain
   * parts of the codebase rely on a conventional id format
   * (see {@link Board.setPlayerPiecesInactive}); consult the piece
   * initialization logic before assuming a custom format is safe.
   */
  id: string;

  /** The color/player this piece belongs to. */
  color: Color;

  /** The type of piece (pawn, knight, bishop, etc.). */
  type: PieceType;

  /**
   * Standard material point value of the piece, following classic chess
   * valuation (pawn=1, knight=3, bishop/rook=5, queen=9). Omitted for the
   * king, which has no material point value.
   */
  points?: 1 | 3 | 5 | 9;
}

/**
 * A piece that has been captured during the game, retaining its original
 * identity plus a record of which color captured it.
 */
export interface CapturedPiece extends Piece {
  /** The color of the player who captured this piece. */
  capturedBy: Color;
}