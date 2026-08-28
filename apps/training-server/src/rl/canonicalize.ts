import { Color, PieceType } from '@chess4/engine';

const N = 14;
const HALF = N + 1; // 15

/** Turn order — matches RuleSet.PLAYER_COLORS / Game's turn cycle. */
export const TURN_ORDER: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];
const TURN_INDEX = new Map<Color, number>(TURN_ORDER.map((c, i) => [c, i]));

/** Fixed channel order for the 6 piece-type planes within each relative-seat block. */
export const PIECE_TYPE_ORDER: PieceType[] = [
  PieceType.PAWN, PieceType.KNIGHT, PieceType.BISHOP,
  PieceType.ROOK, PieceType.QUEEN, PieceType.KING,
];

/**
 * Rotates a 1-indexed (row, col) pair by `k` clockwise quarter turns
 * about the board's center.
 *
 * For `k` = a color's index in {@link TURN_ORDER}, this sends every one
 * of that color's standard starting squares to exactly the square RED
 * occupies at k=0 (verified against every color's king/queen starting
 * square) — this is what makes "encode the position from the mover's
 * own point of view" well-defined, matching this project's relative-
 * color design goal.
 */
export function rotateCoords(row: number, col: number, k: number): [number, number] {
  switch (((k % 4) + 4) % 4) {
    case 0: return [row, col];
    case 1: return [col, HALF - row];
    case 2: return [HALF - row, HALF - col];
    default: return [HALF - col, row];
  }
}

/**
 * This color's index in {@link TURN_ORDER} — the number of clockwise
 * quarter turns needed to canonicalize a position to this color's own
 * perspective.
 */
export function rotationStepsFor(color: Color): number {
  return TURN_INDEX.get(color)!;
}

/**
 * The four colors in relative-seat order starting from `perspective`:
 * [self, next-to-act, opposite, previous]. Used to lay out both the
 * piece planes and the global vector in an order that means the same
 * thing regardless of which color is actually being encoded.
 */
export function seatOrder(perspective: Color): Color[] {
  const i = TURN_INDEX.get(perspective)!;
  return [0, 1, 2, 3].map(offset => TURN_ORDER[(i + offset) % 4]);
}