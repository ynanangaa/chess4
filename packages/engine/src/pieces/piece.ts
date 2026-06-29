import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Position, PositionOffset } from "../position/position";
import { Board } from "../board/board";

export abstract class Piece {
  protected id: string;
  protected color: PlayerColor;
  protected type: PieceType;
  protected position: Position | null = null; // null if captured or uninitialized

  constructor(color: PlayerColor, type: PieceType, pawnNum?: number) {
    this.id = type + "-" + color;
    this.color = color;
    this.type = type;
    // Initialize the position if the piece is pawn (pawnNum is given)
    if (pawnNum) {
      this.id += + "-" + pawnNum;
      switch(this.color) {
        case PlayerColor.RED:
          this.position = {
            row: 2,
            col: String.fromCharCode('c'.charCodeAt(0) + pawnNum) 
          };
          break;
        case PlayerColor.YELLOW:
          this.position = {
            row: 13, 
            col: String.fromCharCode('l'.charCodeAt(0) - pawnNum)
          };
          break;
        case PlayerColor.BLUE:
          this.position = {row: 12 - pawnNum, col: 'b'};
          break;
        case PlayerColor.GREEN:
          this.position = {row: 3 + pawnNum, col: 'm'};
          break;
      }
    }
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
  public setId(id: string): void {
    this.id = id;
  }

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
