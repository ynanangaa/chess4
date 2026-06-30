import { DuplicatePiece } from "./duplicate-piece";
import { PieceType, Color, SquareCoords } from "../types";
import { Board } from "../board";
import { parseSquareId, translateSquareCoords } from "../utils";
import { Square } from "../square";

export class Knight extends DuplicatePiece {
  constructor(color: Color, kingSide: boolean) {
    super(color, PieceType.KNIGHT, kingSide);
    switch(this.color) {
      case Color.RED:
        this.initialSquareId = parseSquareId(1, kingSide ? 10: 5);
        break;
      case Color.YELLOW:
        this.initialSquareId = parseSquareId(14, kingSide ? 5: 10);
        break;
      case Color.BLUE:
        this.initialSquareId = parseSquareId(kingSide ? 10: 5, 1);
        break;
      case Color.GREEN:
        this.initialSquareId = parseSquareId(kingSide ? 5: 10, 14);
        break;
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // Knight moves in an L shape: two squares along one axis and one square perpendicular.
    // It can jump over other pieces, so only the destination square matters.
    // The destination is legal if it is on the board and not occupied by a friendly piece.
    // Opponent-occupied squares are valid capture targets.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

    const moves: SquareCoords[] = [];
    const knightSquaresCoords: (SquareCoords | undefined)[] = [
      translateSquareCoords(
        coords,
        { rowDelta: -2, colDelta: -1 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: -2, colDelta: 1 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: -1, colDelta: -2 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: -1, colDelta: 2 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: 1, colDelta: -2 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: 1, colDelta: 2 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: 2, colDelta: -1 }
      ),
      translateSquareCoords(
        coords,
        { rowDelta: 2, colDelta: 1 }
      ),
    ];

    for (const sq of knightSquaresCoords) {
      if(!sq) continue;
      const square = board.getSquareByCoords(sq);
      if(!square) continue;
      const occupant = board.getPieceAt(square.id);
      if (!occupant || occupant.getColor() !== this.getColor()) {
        moves.push(sq);
      }
    }

    return moves;
  }
}
