import { Piece } from "./piece";
import { Position, PositionOffset } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";
import { PawnDirection } from "./pawn-direction";

export class Pawn extends Piece {
  constructor(id: string, color: PlayerColor, position: Position | null) {
    super(id, color, PieceType.PAWN, position);
  }

  // Check if the pawn is on its initial position, which allows it to move two squares forward.
  // That is on its starting rank (2 for red, 13 for yellow, 2 for blue, 13 for green)
  private isOnInitialPosition(): boolean {
    switch (this.getColor()) {
      case PlayerColor.RED:
        return this.getPosition()?.row === 2;
      case PlayerColor.YELLOW:
        return this.getPosition()?.row === 13;
      case PlayerColor.BLUE:
        return this.getPosition()?.col === 'b';
      case PlayerColor.GREEN:
        return this.getPosition()?.col === 'm';
      default:
        return false;
    }
  }

  // Determine the forward direction for the pawn based on its color
  private getForwardDirection(): PawnDirection {
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
    // Pawns move straight ahead into empty squares and may move two squares on their initial move.
    // Captures are only allowed diagonally forward into squares occupied by opposing pieces.
    const position = this.getPosition();
    if (!position) return [];

    const moves: Position[] = [];
    const direction = this.getForwardDirection();
    const maxAdvance = this.isOnInitialPosition() ? 2 : 1;

    for (let i = 1; i <= maxAdvance; i++) {
        const newPosition = board.translatePosition(position, i * direction.rowDelta, i * direction.colDelta);
        if (!board.isValidPosition(newPosition) || board.isOccupied(newPosition)) break;
        moves.push(newPosition);
    }

    // Diagonal captures
    const captureDirections = this.getCaptureDirections();
    for (const direction of captureDirections) {
        const capturePosition = board.translatePosition(position, direction.rowDelta, direction.colDelta);
        const occupant = board.getPieceAt(capturePosition);
        if (board.isValidPosition(capturePosition) && occupant && occupant.getColor() !== this.getColor()) {
          moves.push(capturePosition);
        }
    }

    return moves;
  }
}
