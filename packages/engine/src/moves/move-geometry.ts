import { Board } from '../board';
import { Piece } from '../types';

/**
 * Width/height of the underlying square grid the engine's flat square
 * ids are laid out on (see the engine README's "Board geometry" section).
 */
export const BOARD_SIZE = 14;

/**
 * Decodes a flat square-id delta (as used in this module's direction
 * tables below, e.g. `-1`, `14`, `27`) into the `(rowStep, colStep)`
 * displacement it represents.
 *
 * This exists purely to guard against a wraparound artifact of the
 * column-major flat id encoding: naively adding `-1` (intended as "one
 * row up") to a square already on row 1 produces a numerically
 * valid-looking id that actually lands on row 14 of the *previous*
 * column — a real board position, but not a legitimate one-step move in
 * any direction. By decoding the intended row/col step and validating it
 * against the piece's actual current row/col, {@link stepInDirection} can
 * detect and reject this case.
 *
 * Only ever called with the fixed deltas defined in this module's
 * direction tables — not intended for arbitrary input.
 */
function decodeDirection(delta: number): { rowStep: number; colStep: number } {
  const colStep = Math.round(delta / BOARD_SIZE);
  const rowStep = delta - BOARD_SIZE * colStep;

  return { rowStep, colStep };
}

/**
 * Computes the square id reached by moving `steps` copies of `direction`
 * away from `from`, where `direction` is one of this module's flat
 * square-id deltas.
 *
 * @returns The destination square id, or `undefined` if the move would
 * leave the underlying 14×14 grid entirely (row or column outside
 * `[1, 14]`) or would only appear valid due to row/column wraparound (see
 * {@link decodeDirection}). Does **not** check whether the destination
 * falls in one of the four cut corners of the four-player cross shape —
 * callers combine this with {@link Board.isValidSquare} separately.
 */
export function stepInDirection(
  from: number,
  direction: number,
  steps: number = 1
): number | undefined {
  const { rowStep, colStep } = decodeDirection(direction);

  const fromRow = (from % BOARD_SIZE) + 1;
  const fromCol = Math.trunc(from / BOARD_SIZE) + 1;

  const row = fromRow + rowStep * steps;
  const col = fromCol + colStep * steps;

  if (row < 1 || row > BOARD_SIZE || col < 1 || col > BOARD_SIZE) return undefined;

  return BOARD_SIZE * (col - 1) + (row - 1);
}

/** Cardinal directions: up, down, left, right (rook, queen). */
export const ROOK_DIRECTIONS: readonly number[] = [-1, 1, -BOARD_SIZE, BOARD_SIZE];

/** Diagonal directions (bishop, queen). */
export const BISHOP_DIRECTIONS: readonly number[] = [-15, 13, -13, 15];

/** All eight cardinal + diagonal directions (queen, king). */
export const QUEEN_DIRECTIONS: readonly number[] = [
  ...ROOK_DIRECTIONS,
  ...BISHOP_DIRECTIONS,
];

/** Alias of {@link QUEEN_DIRECTIONS} — a king moves one step in any of the same eight directions. */
export const KING_DIRECTIONS: readonly number[] = QUEEN_DIRECTIONS;

/** The eight knight-move directions. */
export const KNIGHT_DIRECTIONS: readonly number[] = [-16, 12, -29, 27, -27, 29, -12, 16];

/**
 * Computes reachable destinations for a piece that moves exactly one
 * step per direction (king, knight): tries every direction once,
 * including a destination if it's on the valid board and either empty or
 * occupied by an enemy piece.
 */
export function singleStepDestinations(
  piece: Piece,
  from: number,
  board: Board,
  directions: readonly number[]
): number[] {
  const destinations: number[] = [];

  for (const direction of directions) {
    const to = stepInDirection(from, direction);
    if (to === undefined || !board.isValidSquare(to)) continue;

    const occupant = board.getPieceAt(to);
    if (!occupant || occupant.color !== piece.color) {
      destinations.push(to);
    }
  }

  return destinations;
}

/**
 * Computes reachable destinations for a sliding piece (rook, bishop,
 * queen): repeatedly steps along each direction until blocked by the
 * edge of the grid, a cut corner, or an occupied square — including that
 * occupied square only if it holds an enemy piece (capture), then
 * stopping in that direction.
 */
export function slideDestinations(
  piece: Piece,
  from: number,
  board: Board,
  directions: readonly number[]
): number[] {
  const destinations: number[] = [];

  for (const direction of directions) {
    let steps = 1;

    while (true) {
      const to = stepInDirection(from, direction, steps);
      if (to === undefined || !board.isValidSquare(to)) break;

      const occupant = board.getPieceAt(to);

      if (!occupant) {
        destinations.push(to);
        steps += 1;
        continue;
      }

      if (occupant.color !== piece.color) destinations.push(to);
      break;
    }
  }

  return destinations;
}