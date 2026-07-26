import { parseSquareId } from '@chess4/engine';

/**
 * The board is a 14×14 grid (see the @chess4/engine README's "Board
 * geometry" section). This mirrors the engine's internal board dimension,
 * which is not exported publicly since it's an implementation detail —
 * but the 14×14 size itself is stable, documented, public knowledge about
 * the game, not something expected to change.
 */
export const BOARD_SIZE = 14;

/** A single square's engine-space identity: its flat id and row/col. */
export interface SquareDescriptor {
  squareId: number;
  row: number;
  col: number;
}

/**
 * Builds descriptors for every square in the 14×14 grid (196 total),
 * including the four corner regions that are cut out of the actual
 * playable cross shape — validity is determined separately per square
 * via `Board.isValidSquare`.
 */
export function buildAllSquares(): SquareDescriptor[] {
  const squares: SquareDescriptor[] = [];

  for (let row = 1; row <= BOARD_SIZE; row += 1) {
    for (let col = 1; col <= BOARD_SIZE; col += 1) {
      squares.push({ squareId: parseSquareId(row, col), row, col });
    }
  }

  return squares;
}

/**
 * Converts an engine (row, col) pair into 1-indexed CSS grid line
 * positions, flipping the row axis so that engine row 14 renders at the
 * top of the screen and engine row 1 renders at the bottom.
 *
 * This matches the RED (bottom) / YELLOW (top) / BLUE (left) / GREEN
 * (right) layout described in the engine README: RED's home rows are the
 * lowest engine row numbers, YELLOW's the highest, and column direction
 * already matches left-to-right without needing to flip (BLUE at col 1,
 * GREEN at col 14).
 */
export function toGridPosition(row: number, col: number): { gridRow: number; gridCol: number } {
  return {
    gridRow: BOARD_SIZE - row + 1,
    gridCol: col,
  };
}