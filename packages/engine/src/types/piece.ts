import { Color } from "./color";
import { PieceType } from "./piece-type";

export interface Piece {
  active: boolean;
  id: string;
  color: Color;
  type: PieceType;
  points?: 1 | 3 | 5 | 9;
}

export interface CapturedPiece extends Piece {
  capturedBy: Color;
}