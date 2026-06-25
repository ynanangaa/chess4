import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Position, PositionOffset } from "../position/position";
import { Board } from "../board/board";

export abstract class Piece {
  private id: string;
  private color: PlayerColor;
  private type: PieceType;
  private position: Position | null; // null if captured

  constructor(id: string, color: PlayerColor, type: PieceType, position: Position | null) {
    this.id = id;
    this.color = color;
    this.type = type;
    this.position = position;
  }

  // Accessor methods
  public getId(): string {
    return this.id;
  }

  public getColor(): PlayerColor {
    return this.color;
  }

  public getType(): PieceType {
    return this.type;
  }

  public getPosition(): Position | null {
    return this.position;
  }

  // Mutator methods
  public setPosition(position: Position | null): void {
    this.position = position;
  }

  // Abstract method to be implemented by subclasses
  public abstract getPseudoLegalMoves(board: Board): Position[];

  // Abstract method to get sliding directions for pieces like Rook, Bishop, and Queen
  protected getSlidingDirections(board: Board, directions: PositionOffset[]): Position[] {
    const moves: Position[] = [];
    
    for (const direction of directions) {
      let step = 1;

      while (true) {
        const newPosition = board.translatePosition(
            this.getPosition()!,
            step * direction.rowDelta,
            step * direction.colDelta
        );
        if (!board.isValidPosition(newPosition)) break;
        const occupant = board.getPieceAt(newPosition);
        if (occupant) {
          if (occupant.getColor() !== this.getColor()) {
            moves.push(newPosition);
          }
          break;
        }
        moves.push(newPosition);
        step++;
      }
    }

    return moves;
  };

}
