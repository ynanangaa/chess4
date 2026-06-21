import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Position } from "../position/position";

export interface Piece {
  id: string;
  color: PlayerColor;
  type: PieceType;
  position: Position | null; // null if captured
}

export default Piece;
