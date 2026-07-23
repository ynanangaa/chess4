import { Color } from "../types";

/** The side of the board a castling move is performed on. */
export type CastleSide = "kingside" | "queenside";

/**
 * A special one-time pawn move that requires extra bookkeeping beyond a
 * normal move:
 * - `"doublestep"` — a pawn's initial two-square advance.
 * - `"e-p"` — an en passant capture.
 * - `"promotion"` — a pawn reaching the far rank and being promoted.
 */
export type PawnSpecialMove = "doublestep" | "e-p" | "promotion";

/**
 * A single move, either as a candidate produced by move generation/legality
 * checking, or as a finalized entry in a game's move history.
 *
 * Some fields are populated progressively as a move travels through
 * {@link RuleSet.applyMoveOnBoard}: `capture` may be set by move generation
 * for pseudo-legal moves, or computed during application (direct capture or
 * en passant); `check` is only added once a move has actually been applied
 * and its effects on opposing kings have been computed (see
 * {@link RuleSet.applyMove}).
 */
export interface Move {
  /** The stable id of the piece being moved. */
  pieceId: string;

  /** The square id the piece is moving from. */
  from: number;

  /** The square id the piece is moving to. */
  to: number;

  /**
   * The id of a piece captured by this move, if any. May be set by the
   * move generator for a direct capture, or computed later (e.g. for en
   * passant, where the captured pawn does not occupy `to`).
   */
  capture?: string;

  /**
   * Present if this move is a castling move. The associated rook is moved
   * automatically as part of applying the move (see
   * {@link RuleSet.applyCastling}); `to` refers to the king's destination
   * square only.
   */
  castle?: CastleSide;

  /** Present if this move is a special pawn move (see {@link PawnSpecialMove}). */
  pawnSpecialMove?: PawnSpecialMove;

  /**
   * Records the check(s) **delivered by this move**, i.e. which opposing
   * king(s) end up in check as a result of the moved piece's new position
   * — analogous to the `+`/`#` suffix in standard algebraic notation
   * (e.g. `Ne5+`).
   *
   * Keyed by the **moved piece's own id** (there is only ever one relevant
   * key here in practice, since a single move is made by a single piece),
   * mapped to the list of opponent colors whose king that piece is now
   * checking. Absent (or empty) if the move delivers no check.
   *
   * See {@link RuleSet.getActiveChecks} for the general shape this map
   * follows outside of move-history annotation.
   */
  check?: Map<string, Color[]>;
}