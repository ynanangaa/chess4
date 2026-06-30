import { DuplicatePiece } from "./duplicate-piece";
import { Color, PieceType, SquareCoords } from "../types";
import { Board } from "../board";
import { parseSquareId } from "../utils";

export class Rook extends DuplicatePiece {
  constructor(color: Color, kingSide: boolean) {
    super(color, PieceType.ROOK, kingSide);
    switch(this.color) {
      case Color.RED:
        this.initialSquareId = parseSquareId(1, kingSide ? 11: 4);
        break;
      case Color.YELLOW:
        this.initialSquareId = parseSquareId(14, kingSide ? 4: 11);
        break;
      case Color.BLUE:
        this.initialSquareId = parseSquareId(kingSide ? 11: 4, 1);
        break;
      case Color.GREEN:
        this.initialSquareId = parseSquareId(kingSide ? 4: 11, 14);
        break;
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // Rook moves horizontally or vertically across the board.
    // It continues moving square-by-square until it hits the edge or a piece.
    // It can capture an opponent on the first occupied square in a direction.
    // It cannot move beyond any blocking piece.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: 0 }, // down
        { rowDelta: 1, colDelta: 0 },  // up
        { rowDelta: 0, colDelta: -1 }, // left
        { rowDelta: 0, colDelta: 1 }   // right
    ]);
  }
}
