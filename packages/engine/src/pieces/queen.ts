import { Piece } from "./piece";
import { Color, PieceType, SquareCoords } from "../types";
import { Board } from "../board";
import { parseSquareId } from "../utils";

export class Queen extends Piece {
  constructor(color: Color) {
    super(color, PieceType.QUEEN);
    switch(this.color) {
      case Color.RED:
        this.initialSquareId = parseSquareId(1, 7);
        break;
      case Color.YELLOW:
        this.initialSquareId = parseSquareId(14, 8);
        break;
      case Color.BLUE:
        this.initialSquareId = parseSquareId(7, 1);
        break;
      case Color.GREEN:
        this.initialSquareId = parseSquareId(8, 14);
        break;
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // Queen combines rook and bishop movement: straight lines and diagonals.
    // It may move any number of squares until blocked by another piece.
    // If the blocking piece is an opponent, that square is a legal capture; otherwise movement stops before it.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

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
