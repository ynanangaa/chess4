import { Piece } from "./piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";

export class Queen extends Piece {
  constructor(color: PlayerColor) {
    super(color, PieceType.QUEEN);
    switch(this.color) {
      case PlayerColor.RED:
        this.position = {row: 1, col: 'g'};
        break;
      case PlayerColor.YELLOW:
        this.position = {row: 14, col: 'h'};
        break;
      case PlayerColor.BLUE:
        this.position = {row: 7, col: 'a'};
        break;
      case PlayerColor.GREEN:
        this.position = {row: 8, col: 'n'};
        break;
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Queen combines rook and bishop movement: straight lines and diagonals.
    // It may move any number of squares until blocked by another piece.
    // If the blocking piece is an opponent, that square is a legal capture; otherwise movement stops before it.
    const position = this.getPosition();
    if (!position) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: 0 }, // down
        { rowDelta: 1, colDelta: 0 },  // up
        { rowDelta: 0, colDelta: -1 }, // left
        { rowDelta: 0, colDelta: 1 },  // right
        { rowDelta: -1, colDelta: -1 }, // bottom-left
        { rowDelta: -1, colDelta: 1 },  // bottom-right
        { rowDelta: 1, colDelta: -1 },  // top-left
        { rowDelta: 1, colDelta: 1 }    // top-right
    ]);
  }
}
