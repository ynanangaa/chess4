import { Piece } from '../pieces/piece';
import { Square } from '../square';
import { SquareCoords } from '../types';
import { initializeBoardSquares, inverseParseCol, isSamePiece, parseSquareFrom, parseSquareId } from '../utils';

export class Board {
  // pieces keyed by id
  private squares: Map<number, Square> = new Map();

  constructor(initialPieces?: Piece[]) {
    if (initialPieces) 
      initialPieces.forEach(p => 
        this.squares.set(
          p.getInitialSquareId(),
          parseSquareFrom(p.getInitialSquareId())
        )
      )
    const initializedSquares = initializeBoardSquares();
    initializedSquares.forEach(square => this.squares.set(square.id, square));
  }

  // Return all pieces
  public getSquares(): Square[] {
    return Array.from(this.squares.values());
  }

  // Find piece at a position
  public getSquare(id: number): Square | undefined {
    return this.squares.get(id);
  }

  // Get the square coords a piece
  public getCoordsOf(piece: Piece): SquareCoords | undefined {
    const square = this.getSquares().find(sq => isSamePiece(piece, sq.occupant));
    return square?.coords;
  }

  // Remove piece by id (marks captured by setting position=null) and returns removed piece
  /*removePiece(id: string): Piece | undefined {
    const p = this.pieces.get(id);
    if (!p) return undefined;
    const copy = { ...p, position: null };
    this.pieces.set(id, copy);
    return { ...copy };
  }*/

  // Is square occupied by a living piece
  public isOccupied(id: number): boolean {
    return this.getPieceAt(id) ? true: false;
  }

  public getPieceAt(id: number): Piece | undefined {
    const square = this.getSquare(id);
    return square?.occupant;
  }

  public getPieces(): Piece[] {
    return this.getSquares()
      .map(s => s.occupant)
      .filter(p => p !== undefined)
  }

  public getSquareOfPiece(pieceId: string): Square | undefined {
    const squares = this.getSquares();
    const square = squares.find(s => s.occupant?.getId() === pieceId);
    return square!;
  }

  // Move a piece to a target position.
  public setPiece(pieceId: string, to: number): Piece | undefined {
    const sq = this.getSquareOfPiece(pieceId); // Start square
    if (!sq) return undefined;

    const moved = sq.occupant!;
    const square = this.squares.get(to); // Destination square
    if (!square) return undefined;
    this.squares.set(sq.id, {...sq, occupant: undefined}) // Empty start square
    this.squares.set(to, {...square, occupant: moved}) // Set destination square with piece
    return moved;
  }

  public getSquareByCoords(coords: SquareCoords): Square | undefined {
    const id = parseSquareId(
      coords.row,
      inverseParseCol(coords.col)
    );
    return this.getSquare(id);
}

  // Does the square exists on the board (14 x 14, with some exceptions)
  public squareExists(id: number): boolean {
    // Check if position is not in the excluded squares
    return this.squares.has(id);
  }

  // Clear board
  public destroy(): void {
    this.squares.clear();
  }

  // Clone board
  /*clone(): Board {
    return new Board();
  }*/

}
