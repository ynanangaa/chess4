import { Position } from "../position/position";

export interface Move {
  pieceId: string;
  from: Position;
  to: Position;
}
