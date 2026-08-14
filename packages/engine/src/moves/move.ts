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
 * The `check` field is only added once a move has actually been applied and
 * its effects on opposing kings have been computed 
 * (see {@link RuleSet.applyMove}).
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
   * Colors whose king is, as a direct causal consequence of this move,
   * in check — analogous to the `+`/`#` suffix in standard algebraic
   * notation (e.g. `Ne5+`).
   *
   * "Direct causal consequence" is deliberately narrower than simply
   * "in check right after this move and not right before it" (see
   * {@link RuleSet.recordMove}): a color's own last move is guaranteed
   * to have left its own king out of check, so for each color found in
   * check right after this move, this move is replayed by itself
   * directly on top of the position as it stood right after that
   * color's own last move — with every intervening move made by other
   * colors stripped out — to determine whether this move, on its own,
   * still produces check. This correctly:
   *
   * - Attributes a *discovered* check to the mover even when the
   *   attacking piece belongs to a **different color** than the piece
   *   that moved (e.g. color A's piece vacates a square that was
   *   blocking color B's line of attack on color C's king — a scenario
   *   unique to four-player chess, since causal responsibility for the
   *   check lies with whoever's move created it, not with whichever
   *   piece happens to geometrically attack the king).
   * - Independently credits this move even if the checked king was
   *   *already* in check going into this move for an unrelated reason
   *   (e.g. an earlier, still-unanswered check from another color) —
   *   as long as this move would, by itself, still produce check on
   *   that king. This mirrors how
   *   {@link RuleSet.findCheckmateArchitect} treats an "overdetermined"
   *   mate: multiple independently-sufficient causes can each be
   *   credited, rather than only whichever happened first.
   *
   * Absent (or empty) if this move causes no check by this analysis.
   */
  check?: Color[];
}