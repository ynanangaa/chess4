import { Col } from "./col";
import { Row } from "./row";

export interface SquareCoords {
  row: Row;
  col: Col;
}

export interface SquareCoordsOffset {
  rowDelta: number;
  colDelta: number;
}
