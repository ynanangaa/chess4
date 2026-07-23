import { Col } from "./col";
import { Row } from "./row";

/**
 * The coordinates of a square on the board, expressed as a
 * row/column pair rather than a flat square id.
 *
 * @see {@link Row}
 * @see {@link Col}
 */
export interface SquareCoords {
  row: Row;
  col: Col;
}

/**
 * A relative row/column displacement between two squares, typically used
 * to describe a piece's movement pattern (e.g. a knight's `(±1, ±2)` /
 * `(±2, ±1)` offsets) independent of any specific starting square.
 */
export interface SquareCoordsOffset {
  /** Change in row, positive or negative. */
  rowDelta: number;
  /** Change in column, positive or negative. */
  colDelta: number;
}