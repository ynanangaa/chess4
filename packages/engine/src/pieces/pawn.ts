import { Piece } from "./piece";
import { Color, PieceType, SquareCoords, SquareCoordsOffset } from "../types";
import { Board } from "../board";
import { translateSquareCoords } from "../utils";

export class Pawn extends Piece {
  constructor(color: Color, pawnNum: number) {
    super(color, PieceType.PAWN, pawnNum);
  }

  public setType(type: PieceType): void {
    this.type = type;
  }

  // Determine the forward direction for the pawn based on its color
  public getForwardDirection(): SquareCoordsOffset {
    switch (this.color) {
        case Color.RED:
            return { rowDelta: 1, colDelta: 0 };

        case Color.YELLOW:
            return { rowDelta: -1, colDelta: 0 };

        case Color.BLUE:
            return { rowDelta: 0, colDelta: 1 };

        case Color.GREEN:
            return { rowDelta: 0, colDelta: -1 };
    }
  }

  private getCaptureDirections(): SquareCoordsOffset[] {
    switch (this.getColor()) {
        case Color.RED:
            return [{ rowDelta: 1, colDelta: -1 }, { rowDelta: 1, colDelta: 1 }];
        case Color.YELLOW:
            return [{ rowDelta: -1, colDelta: -1 }, { rowDelta: -1, colDelta: 1 }];
        case Color.BLUE:
            return [{ rowDelta: -1, colDelta: 1 }, { rowDelta: 1, colDelta: 1 }];
        case Color.GREEN:
            return [{ rowDelta: -1, colDelta: -1 }, { rowDelta: 1, colDelta: -1 }];
    }
  }

  public getStandardMoves(board: Board): SquareCoords[] {
    // Pawn movement is directional and depends on the pawn's color.
    // Red/yellow pawns advance vertically, while blue/green pawns advance horizontally.
    // Pawns just move straight ahead into empty squares.
    // Captures are only allowed diagonally forward into squares occupied by opposing pieces.
    const coords = board.getCoordsOf(this);
    if (!coords) return [];

    const moves: SquareCoords[] = [];
    const direction = this.getForwardDirection();

    const translatedSquare = translateSquareCoords(coords, direction);
    if(translatedSquare) {
      const oneStepForward = board.getSquareByCoords(translatedSquare);
      if(oneStepForward) {
        if (!board.isOccupied(oneStepForward.id)) {
          moves.push(oneStepForward.coords);
        }
      };
    }

    // Diagonal captures
    const captureDirections = this.getCaptureDirections();
    for (const captureDirection of captureDirections) {
      const captureTranslated = translateSquareCoords(coords, captureDirection);
      if(captureTranslated) {
        const captureSquare = board.getSquareByCoords(captureTranslated);
        if(captureSquare) {
          const occupant = board.getPieceAt(captureSquare.id);
          if (board.squareExists(captureSquare.id) &&
           occupant && occupant.getColor() !== this.getColor()
          ) {
            moves.push(captureSquare.coords);
          }
        }
      }
    }

    return moves;
  }
}
