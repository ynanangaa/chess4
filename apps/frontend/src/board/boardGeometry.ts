import { parseSquareId, Color } from '@chess4/engine';

export const BOARD_SIZE = 14;

export interface SquareDescriptor {
  squareId: number;
  row: number;
  col: number;
}

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
 * Turn order (see `Game`/`RuleSet`) walks clockwise around the board's
 * fixed layout: RED (bottom) → BLUE (left) → YELLOW (top) → GREEN
 * (right). This array's index order is what `rotationDeltaFor` uses to
 * compute how far to rotate the default layout for a given perspective.
 */
const PERSPECTIVE_ORDER: Color[] = [
  Color.RED,
  Color.BLUE,
  Color.YELLOW,
  Color.GREEN,
];

/**
 * Degrees of clockwise rotation to apply to the default, RED-bottom
 * layout so that `perspective`'s own home side ends up at the bottom of
 * the screen instead — i.e. as if that player were sitting in front of
 * their own side of the board.
 */
function rotationDeltaFor(perspective: Color): 0 | 90 | 180 | 270 {
  const index = PERSPECTIVE_ORDER.indexOf(perspective);
  const steps = (PERSPECTIVE_ORDER.length - index) % PERSPECTIVE_ORDER.length;

  return (steps * 90) as 0 | 90 | 180 | 270;
}

/**
 * Rotates a 0-indexed (row, col) position within an `n`×`n` grid
 * clockwise by `delta` degrees.
 */
function rotate(r0: number, c0: number, delta: 0 | 90 | 180 | 270, n: number): [number, number] {
  switch (delta) {
    case 0:
      return [r0, c0];
    case 90:
      return [c0, n - 1 - r0];
    case 180:
      return [n - 1 - r0, n - 1 - c0];
    case 270:
      return [n - 1 - c0, r0];
  }
}

/**
 * Converts an engine (row, col) pair into 1-indexed CSS grid line
 * positions, from the point of view of `perspective` — i.e. rotated so
 * that `perspective`'s own home side renders at the bottom of the
 * screen, exactly as if that player were sitting in front of their own
 * side of the board.
 *
 * `perspective` defaults to RED, reproducing the original fixed
 * RED-bottom / YELLOW-top / BLUE-left / GREEN-right layout described in
 * the engine README when no rotation is requested.
 */
export function toGridPosition(
  row: number,
  col: number,
  perspective: Color = Color.RED
): { gridRow: number; gridCol: number } {
  const r0 = BOARD_SIZE - row; // 0-indexed row from top, RED-bottom default
  const c0 = col - 1;          // 0-indexed col from left

  const [rr, rc] = rotate(r0, c0, rotationDeltaFor(perspective), BOARD_SIZE);

  return { gridRow: rr + 1, gridCol: rc + 1 };
}