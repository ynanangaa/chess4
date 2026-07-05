import { Piece } from '../types/piece';
import { Color, PieceType } from '../types';
import { initializePieces, validBoardSquares } from '../utils';

export class Board {
  // pieces keyed by piece id
  private pieces: Map<string, Piece> = new Map();
  // piece positions keyed by piece id
  private piecePositions: Map<string, number> = new Map();
  // occupied squares keyed by position : reverse mapping of piecePositions
  private occupiedSquares: Map<number, string> = new Map();
  // validSquares : set of valid square ids on the board
  private validSquares: Set<number> = validBoardSquares();

  constructor(initialPieces?: [Piece[], number[]]) {
    let [pieces, initialSquareIds]: [Piece[], number[]] = [[], []];
    if (initialPieces) {
      [pieces, initialSquareIds] = initialPieces;
    } else {
      const allPieces: Piece[] = [];
      const allPositions: number[] = [];

      [
        initializePieces(Color.RED),
        initializePieces(Color.BLUE),
        initializePieces(Color.YELLOW),
        initializePieces(Color.GREEN)
      ].forEach(([piecesForColor, positionsForColor]) => {
        allPieces.push(...piecesForColor);
        allPositions.push(...positionsForColor);
      });

      [pieces, initialSquareIds] = [allPieces, allPositions];
    }
    // Initialize pieces
    pieces.forEach((p, i) => 
      this.pieces.set(p.id, p)
    )
    // Initialize piece positions and occupied squares
    pieces.forEach((p, i) => 
      this.piecePositions.set(p.id, initialSquareIds[i])
    );
    pieces.forEach((p, i) => 
      this.occupiedSquares.set(initialSquareIds[i], p.id)
    );
  }

  // Return all occupied squares on the board
  public getOccupiedSquares(): Map<number, string> {
    return this.occupiedSquares;
  }

  public getOccupiedSquaresByColor(color: Color): [number, string][] {
    const colorSquares = Array.from(this.occupiedSquares.entries()).filter(([squareId, pieceId]) => {
      const piece = this.getPiece(pieceId);
      return piece?.color === color;
    });
    return colorSquares;
  }

  // Return piece by id
  public getPiece(id: string): Piece | undefined {
    return this.pieces.get(id);
  }

  // Return piece at a square id
  public getPieceAt(squareId: number): Piece | undefined {
    const pieceId = this.occupiedSquares.get(squareId);
    if (!pieceId) return undefined;
    return this.pieces.get(pieceId);
  }

  public getPiecesByColor(color: Color): Piece[] {
    return Array.from(this.pieces.values()).filter(p =>
      p.color === color
    )
  }

  // Return position of a piece
  public getPositionOf(pieceId: string): number | undefined {
    return this.piecePositions.get(pieceId);
  }

  // Check if a square is occupied
  public isOccupied(squareId: number): boolean {
    return this.occupiedSquares.has(squareId);
  }

  // Check if a square exists on the board
  public isValidSquare(id: number): boolean {
    return this.validSquares.has(id);
  }

  /* Place a piece on the board at a specific position
   * If the piece already exists, it will be moved to the new position.
   * If the position is already occupied, the existing piece will be replaced.
  */
  public placePiece(pieceId: string, squareId: number): Piece | undefined {
    const piece = this.pieces.get(pieceId);
    if (!piece) return undefined;

    // Remove piece from current position
    const currentSquareId = this.piecePositions.get(pieceId);
    if (currentSquareId !== undefined) {
      this.occupiedSquares.delete(currentSquareId);
      this.piecePositions.delete(pieceId);
    }

    // Remove any existing piece at the new position
    const existingPieceId = this.occupiedSquares.get(squareId);
    if (existingPieceId !== undefined) {
      this.occupiedSquares.delete(squareId);
      this.piecePositions.delete(existingPieceId);
      this.pieces.delete(existingPieceId);
    }

    // Set piece at new position
    this.piecePositions.set(pieceId, squareId);
    this.occupiedSquares.set(squareId, pieceId);

    return piece;
  }

  public removePiece(pieceId: string): Piece | undefined {
    const piece = this.pieces.get(pieceId);
    if (!piece) return undefined;

    const currentSquareId = this.piecePositions.get(pieceId);
    if (currentSquareId !== undefined) {
      this.occupiedSquares.delete(currentSquareId);
      this.piecePositions.delete(pieceId);
    }

    this.pieces.delete(pieceId);
    return piece;
  }

  // Set the type of a pawn when it promotes
  public setPromotionPieceType(pieceId: string, newType: PieceType): void {
    const piece = this.getPiece(pieceId);
    if(piece?.type === PieceType.PAWN)
      this.pieces.set(pieceId, {...piece, type: newType});
  }

  // Clear board
  /*public destroy(): void {
    this.squares.clear();
  }*/

  // Clone board
  /*clone(): Board {
    return new Board();
  }*/

}
