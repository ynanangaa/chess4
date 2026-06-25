import { Piece } from "./piece";
import { Position, PositionOffset } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";

export class Bishop extends Piece {
  constructor(id: string, color: PlayerColor, position: Position | null) {
    super(id, color, PieceType.BISHOP, position);
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Bishop moves diagonally in any direction.
    // It continues stepping square-by-square until it goes off-board or encounters another piece.
    // If the encountered piece belongs to an opponent, that square is a legal capture target.
    // If the encountered piece is friendly, movement stops before that square.
    const position = this.getPosition();
    if (!position) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: -1 }, // bottom-left
        { rowDelta: -1, colDelta: 1 },  // bottom-right
        { rowDelta: 1, colDelta: -1 },  // top-left
        { rowDelta: 1, colDelta: 1 }   // top-right
    ]);
  }
}
