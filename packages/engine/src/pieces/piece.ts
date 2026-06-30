import { Color, SquareCoords, SquareCoordsOffset } from "../types";
import { PieceType } from "../types";
import { Board } from "../board";
import { parseSquareId, translateSquareCoords } from "../utils";

export abstract class Piece {
  protected id: string;
  protected color: Color;
  protected type: PieceType;
  protected initialSquareId: number;

  constructor(color: Color, type: PieceType, pawnNum?: number) {
    this.id = type ? `${type}-${color}` : `${color}`;
    this.color = color;
    this.type = type;
    let initialPos: number = 0;
    // Initialize the position if the piece is pawn (pawnNum is given)
    if (pawnNum) {
      this.id += `-${pawnNum}`;
      switch(this.color) {
        case Color.RED:
          initialPos += parseSquareId(2, 3 + pawnNum);
          break;
        case Color.YELLOW:
          initialPos += parseSquareId(13, 12 - pawnNum);
          break;
        case Color.BLUE:
          initialPos += parseSquareId(12 - pawnNum, 2);
          break;
        case Color.GREEN:
          initialPos += parseSquareId(3 + pawnNum, 13);
          break;
      }
    }
    this.initialSquareId = initialPos;
  }

  // Accessor methods
  public getId(): string {
    return this.id;
  }

  public getColor(): Color {
    return this.color;
  }

  public getType(): PieceType {
    return this.type;
  }

  public getInitialSquareId(): number {
    return this.initialSquareId;
  }

  // Mutator methods
  public setId(id: string): void {
    this.id = id;
  }

  public setInitialSquareId(initSquareId: number): void {
    this.initialSquareId = initSquareId;
  }

  // Abstract method to be implemented by subclasses
  public abstract getStandardMoves(board: Board): SquareCoords[];

  // Abstract method to get sliding directions for pieces like Rook, Bishop, and Queen
  protected getSlidingDirections(board: Board, directions: SquareCoordsOffset[]): SquareCoords[] {
    const moves: SquareCoords[] = [];
    
    for (const direction of directions) {
      let currentSquare = board.getSquareOfPiece(this.id)!;

      while (true) {
        const translatedCoords = translateSquareCoords(currentSquare?.coords, direction);
        if(!translatedCoords) break;
        const newSquare = board.getSquareByCoords(translatedCoords);
        if (!newSquare) break;
        const occupant = board.getPieceAt(newSquare.id);
        if (occupant) {
          if (occupant.getColor() !== this.getColor()) {
            moves.push(newSquare.coords);
          }
          break;
        }
        moves.push(newSquare.coords);
        currentSquare = newSquare;
      }
    }

    return moves;
  };

}
