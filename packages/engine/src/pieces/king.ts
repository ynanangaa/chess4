import { Piece } from "./piece";
import { Color, PieceType, SquareCoords } from "../types";;
import { Board } from "../board";
import { parseSquareId, translateSquareCoords } from "../utils";

export class King extends Piece {
  constructor(color: Color) {
    super(color, PieceType.KING);
    switch(this.color) {
      case Color.RED:
        this.initialSquareId = parseSquareId(1, 8);
        break;
      case Color.YELLOW:
        this.initialSquareId = parseSquareId(14, 7);
        break;
      case Color.BLUE:
        this.initialSquareId = parseSquareId(8, 1);
        break;
      case Color.GREEN:
        this.initialSquareId = parseSquareId(7, 14);
        break;
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // King moves one square in any of the eight surrounding directions.
    // It may move onto an empty square or capture an opposing piece.
    // It cannot move onto a square occupied by a friendly piece.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

    const squares: SquareCoords[] = [];
    const directionOffsets = [-1, 0, 1];

    for (const rowOffset of directionOffsets) {
      for (const colOffset of directionOffsets) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const translatedSquare = translateSquareCoords(
          coords, 
          { rowDelta: rowOffset, colDelta: colOffset }
        )
        if(!translatedSquare) continue;
        const newSquare = board.getSquareByCoords(translatedSquare);
        if(!newSquare) continue;
        const occupant = board.getPieceAt(newSquare.id);
        if (!occupant || occupant.getColor() !== this.getColor()) {
          squares.push(newSquare.coords);
        }
      }
    }

    return squares;
  }
}
