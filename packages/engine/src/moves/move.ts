import { Color } from "../types";

/** The side of the board a castling move is performed on. */
export type CastleSide = "kingside" | "queenside";

/**
 * A special one-time pawn move that requires extra bookkeeping beyond a
 * normal move:
 * - `"doublestep"` — a pawn's initial two-square advance.
 * - `"promotion"` — a pawn reaching the far rank and being promoted.
 *
 * @remarks
 * En passant does not exist in this four-player variant and is
 * intentionally not represented here.
 */
export type PawnSpecialMove = "doublestep" | "promotion";

/**
 * A single move, either as a candidate produced by move generation/legality
 * checking, or as a finalized entry in a game's move history.
 *
 * Some fields are populated progressively as a move travels through
 * {@link RuleSet.applyMoveOnBoard}: `capture` may be set by move generation
 * for a direct capture, or (re)computed during application against the
 * board's actual occupancy; `check` is only added once a move has actually
 * been applied and its effects on opposing kings have been computed (see
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
   * The id of a piece captured by this move, if any. Resolved from board
   * occupancy at the destination square.
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
   * Colors whose king became **newly** in check as a direct result of
   * this move — i.e. was not already in check immediately beforehand —
   * analogous to the `+`/`#` suffix in standard algebraic notation (e.g.
   * `Ne5+`).
   *
   * This correctly attributes a *discovered* check to the mover even when
   * the attacking piece belongs to a **different color** than the piece
   * that moved (e.g. color A's piece vacates a square that was blocking
   * color B's line of attack on color C's king — a scenario unique to
   * four-player chess, since causal responsibility for the check lies
   * with whoever's move created it, not with whichever piece happens to
   * geometrically attack the king).
   *
   * A king already in check before this move is never re-included here,
   * even if this same move also happens to threaten it independently.
   *
   * Absent (or empty) if the move delivers no *new* check.
   */
  check?: Color[];
}