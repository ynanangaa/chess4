import { Piece } from "./piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";
import { PawnDirection } from "./pawn-direction";

export class Pawn extends Piece {
  constructor(color: PlayerColor, pawnNum: number) {
    super(color, PieceType.PAWN, pawnNum);;
  }

  public setType(type: PieceType): void {
    this.type = type;
  }

  // Determine the forward direction for the pawn based on its color
  public getForwardDirection(): PawnDirection {
    switch (this.getColor()) {
        case PlayerColor.RED:
            return { rowDelta: 1, colDelta: 0 };

        case PlayerColor.YELLOW:
            return { rowDelta: -1, colDelta: 0 };

        case PlayerColor.BLUE:
            return { rowDelta: 0, colDelta: 1 };

        case PlayerColor.GREEN:
            return { rowDelta: 0, colDelta: -1 };
    }
  }

  private getCaptureDirections(): PawnDirection[] {
    switch (this.getColor()) {
        case PlayerColor.RED:
            return [{ rowDelta: 1, colDelta: -1 }, { rowDelta: 1, colDelta: 1 }];
        case PlayerColor.YELLOW:
            return [{ rowDelta: -1, colDelta: -1 }, { rowDelta: -1, colDelta: 1 }];
        case PlayerColor.BLUE:
            return [{ rowDelta: -1, colDelta: 1 }, { rowDelta: 1, colDelta: 1 }];
        case PlayerColor.GREEN:
            return [{ rowDelta: -1, colDelta: -1 }, { rowDelta: 1, colDelta: -1 }];
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Pawn movement is directional and depends on the pawn's color.
    // Red/yellow pawns advance vertically, while blue/green pawns advance horizontally.
    // Pawns just move straight ahead into empty squares.
    // Captures are only allowed diagonally forward into squares occupied by opposing pieces.
    const position = this.getPosition();
    if (!position) return [];

    const moves: Position[] = [];
    const direction = this.getForwardDirection();

    const oneStepForward = board.translatePosition(position, direction.rowDelta, direction.colDelta);
    if (board.isValidPosition(oneStepForward) && !board.isOccupied(oneStepForward)) {
      moves.push(oneStepForward);
    }

    // Diagonal captures
    const captureDirections = this.getCaptureDirections();
    for (const captureDirection of captureDirections) {
      const capturePosition = board.translatePosition(position, captureDirection.rowDelta, captureDirection.colDelta);
      const occupant = board.getPieceAt(capturePosition);
      if (board.isValidPosition(capturePosition) && occupant && occupant.getColor() !== this.getColor()) {
        moves.push(capturePosition);
      }
    }

    return moves;
  }
}
