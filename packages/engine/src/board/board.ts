import { Piece } from '../pieces/piece';
import { Position } from '../position/position';
import { INVALID_SQUARES } from './constants';

export class Board {
  // pieces keyed by id
  private pieces: Map<string, Piece> = new Map();

  constructor(initialPieces?: Piece[]) {
    if (initialPieces) initialPieces.forEach(p => this.pieces.set(p.getId(), p));
  }

  private isSamePosition(left: Position | null, right: Position | null): boolean {
    return !!left && !!right && left.col === right.col && left.row === right.row;
  }

  // Return all pieces
  public getPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  // Get piece by id
  public getPiece(id: string): Piece | undefined {
    return this.pieces.get(id);
  }

  // Find piece at a position
  public getPieceAt(position: Position): Piece | undefined {
    for (const p of this.pieces.values()) {
      if (this.isSamePosition(p.getPosition(), position)) return p;
    }
    return undefined;
  }

  // Add a piece (overwrites if id exists)
  addPiece(piece: Piece): void {
    this.pieces.set(piece.getId(), piece);
  }

  // Remove piece by id (marks captured by setting position=null) and returns removed piece
  /*removePiece(id: string): Piece | undefined {
    const p = this.pieces.get(id);
    if (!p) return undefined;
    const copy = { ...p, position: null };
    this.pieces.set(id, copy);
    return { ...copy };
  }*/

  // Move a piece to a target position.
  public movePiece(id: string, to: Position): Piece | undefined {
    const p = this.pieces.get(id);
    if (!p) return undefined;
    const moved = this.pieces.get(id);
    if (!moved) return undefined;
    moved.setPosition(to);
    this.pieces.set(id, moved);
    return moved;
  }

  // Is square occupied by a living piece
  public isOccupied(position: Position): boolean {
    return Array.from(this.pieces.values()).some(p => this.isSamePosition(p.getPosition(), position));
  }

  // Does the square exists on the board (14 x 14, with some exceptions)
  public isValidPosition(position: Position): boolean {
    // Check if row is within valid range (1-14)
    if (position.row < 1 || position.row > 14) return false;
    
    // Check if column is within valid range (a-n)
    if (position.col < 'a' || position.col > 'n') return false;
    
    // Check if position is not in the excluded squares
    return !INVALID_SQUARES.has(`${position.col}${position.row}`);
  }

  // Translate a position by row and column offsets
  public translatePosition(position: Position, rowOffset: number, colOffset: number): Position {
    const newRow = position.row + rowOffset;
    const newCol = String.fromCharCode(position.col.charCodeAt(0) + colOffset);
    return { row: newRow, col: newCol };
  }

  // Clear board
  public destroy(): void {
    this.pieces.clear();
  }

  // Clone board
  clone(): Board {
    return new Board(this.getPieces());
  }

  // Simple text representation
  public toString(): string {
    const pieces = this.getPieces();
    return pieces
      .map(p => `${p.getId()}:${p.getType()}:${p.getColor()}:${p.getPosition() ?? 'captured'}`)
      .join(' ');
  }
}
