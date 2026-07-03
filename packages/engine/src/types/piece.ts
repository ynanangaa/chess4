import { Color } from "./color";
import { PieceType } from "./piece-type";

export interface Piece {
  id: string;
  color: Color;
  type: PieceType;
}