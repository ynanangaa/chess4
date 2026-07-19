import { Piece } from '../types/piece';
import { Color, PieceType } from '../types';
import { initializePieces, validBoardSquares } from '../utils';

export class Board {
  // Pieces keyed by their stable piece id.
  private pieces: Map<string, Piece> = new Map();
  // Piece square ids keyed by piece id.
  private piecePositions: Map<string, number> = new Map();
  // Occupied squares keyed by square id. This is the reverse lookup of piecePositions.
  private occupiedSquares: Map<number, string> = new Map();
  // Valid square ids for the four-player board shape.
  private validSquares: Set<number> = validBoardSquares();

  constructor(initialPieces?: [Piece[], number[]]) {
    const [pieces, initialSquareIds] = initialPieces ?? this.buildDefaultSetup();

    pieces.forEach((piece, index) => {
      const squareId = initialSquareIds[index];

      this.pieces.set(piece.id, piece);
      this.piecePositions.set(piece.id, squareId);
      this.occupiedSquares.set(squareId, piece.id);
    });
  }

  public getOccupiedSquares(): Map<number, string> {
    return new Map(this.occupiedSquares);
  }

  public getOccupiedSquaresByColor(color: Color): [number, string][] {
    return Array.from(this.occupiedSquares.entries()).filter(([, pieceId]) => {
      const piece = this.getPiece(pieceId);

      return piece?.color === color;
    });
  }

  public getPiece(id: string): Piece | undefined {
    return this.pieces.get(id);
  }

  public getPieceAt(squareId: number): Piece | undefined {
    const pieceId = this.occupiedSquares.get(squareId);

    if (!pieceId) return undefined;

    return this.pieces.get(pieceId);
  }

  public getPiecesByColor(color: Color): Piece[] {
    return Array.from(this.pieces.values()).filter(piece => piece.color === color);
  }

  public getPositionOf(pieceId: string): number | undefined {
    return this.piecePositions.get(pieceId);
  }

  public isOccupied(squareId: number): boolean {
    return this.occupiedSquares.has(squareId);
  }

  public isValidSquare(id: number): boolean {
    return this.validSquares.has(id);
  }

  public placePiece(pieceId: string, squareId: number): Piece | undefined {
    const piece = this.pieces.get(pieceId);

    if (!piece) return undefined;

    const currentSquareId = this.piecePositions.get(pieceId);
    if (currentSquareId !== undefined) {
      this.occupiedSquares.delete(currentSquareId);
      this.piecePositions.delete(pieceId);
    }

    const existingPieceId = this.occupiedSquares.get(squareId);
    if (existingPieceId !== undefined) {
      this.occupiedSquares.delete(squareId);
      this.piecePositions.delete(existingPieceId);
      this.pieces.delete(existingPieceId);
    }

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

  public setPlayerPiecesInactive(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    const king = this.pieces.get(`K-${color}`);
    if (king && king.active && !keepKingActive) this.pieces.set(
      `K-${color}`, 
      {...king, active: false}
    );
    this.pieces.forEach((p, id, _) => {
      if (p.color === color && p.type !== PieceType.KING) {
        if(!p.active) return;
        this.pieces.set(p.id, {...p, active: false })
      }
    });
  }

  public setPromotionPieceType(pieceId: string, newType: PieceType): void {
    const piece = this.getPiece(pieceId);

    if (piece?.type === PieceType.PAWN) {
      this.pieces.set(pieceId, { ...piece, type: newType });
    }
  }

  public clone(): Board {
    const pieces = Array.from(this.pieces.values());
    const positions = pieces.map(piece => this.piecePositions.get(piece.id)!);

    return new Board([pieces, positions]);
  }

  private buildDefaultSetup(): [Piece[], number[]] {
    const pieces: Piece[] = [];
    const positions: number[] = [];

    [
      initializePieces(Color.RED),
      initializePieces(Color.BLUE),
      initializePieces(Color.YELLOW),
      initializePieces(Color.GREEN)
    ].forEach(([piecesForColor, positionsForColor]) => {
      pieces.push(...piecesForColor);
      positions.push(...positionsForColor);
    });

    return [pieces, positions];
  }
}
