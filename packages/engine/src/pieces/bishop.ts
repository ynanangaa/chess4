import { DuplicatePiece } from "./duplicate-piece";
import { Color, PieceType, SquareCoords } from "../types";
import { Board } from "../board";
import { parseSquareId } from "../utils";

export class Bishop extends DuplicatePiece {
  constructor(color: Color, kingSide: boolean) {
    super(color, PieceType.BISHOP, kingSide);
    switch(this.color) {
      case Color.RED:
        this.initialSquareId = parseSquareId(1, kingSide ? 9: 6);
        break;
      case Color.YELLOW:
        this.initialSquareId = parseSquareId(14, kingSide ? 6: 9);
        break;
      case Color.BLUE:
        this.initialSquareId = parseSquareId(kingSide ? 9: 6, 1);
        break;
      case Color.GREEN:
        this.initialSquareId = parseSquareId(kingSide ? 6: 9, 14);
        break;
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // Bishop moves diagonally in any direction.
    // It continues stepping square-by-square until it goes off-board or encounters another piece.
    // If the encountered piece belongs to an opponent, that square is a legal capture target.
    // If the encountered piece is friendly, movement stops before that square.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: -1 }, // bottom-left
        { rowDelta: -1, colDelta: 1 },  // bottom-right
        { rowDelta: 1, colDelta: -1 },  // top-left
        { rowDelta: 1, colDelta: 1 }   // top-right
    ]);
  }
}
