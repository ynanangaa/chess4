/**
 * The type of a chess piece, represented by its standard algebraic
 * notation letter.
 *
 * ⚠️ `PAWN` is intentionally the empty string `''`, matching algebraic
 * notation convention where pawn moves omit a piece letter (e.g. `e4`
 * rather than `Pe4`). This means `PieceType.PAWN` is a **falsy** value —
 * avoid `if (piece.type)` as an "is this a pawn" check, since that
 * condition is `false` for pawns. Prefer explicit comparison:
 * `piece.type === PieceType.PAWN`.
 */
export enum PieceType {
  /** Pawn. Notation: none (empty string), per algebraic notation convention. */
  PAWN = '',
  /** Knight. Notation: `N`. */
  KNIGHT = 'N',
  /** Bishop. Notation: `B`. */
  BISHOP = 'B',
  /** Rook. Notation: `R`. */
  ROOK = 'R',
  /** Queen. Notation: `Q`. */
  QUEEN = 'Q',
  /** King. Notation: `K`. */
  KING = 'K',
}