import { Piece } from '../pieces/piece';
import { Position } from '../position/position';

export class Board {
  // pieces keyed by id
  private pieces: Map<string, Piece> = new Map();

  constructor(initialPieces?: Piece[]) {
    if (initialPieces) initialPieces.forEach(p => this.pieces.set(p.id, { ...p }));
  }

  // Return all pieces (copy)
  getPieces(): Piece[] {
    return Array.from(this.pieces.values()).map(p => ({ ...p }));
  }

  // Get piece by id
  getPiece(id: string): Piece | undefined {
    const p = this.pieces.get(id);
    return p ? { ...p } : undefined;
  }

  // Find piece at a position
  getPieceAt(position: Position): Piece | undefined {
    for (const p of this.pieces.values()) if (p.position === position) return { ...p };
    return undefined;
  }

  // Add a piece (overwrites if id exists)
  addPiece(piece: Piece): void {
    this.pieces.set(piece.id, { ...piece });
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
  movePiece(id: string, to: Position): Piece | undefined {
    const p = this.pieces.get(id);
    if (!p) return undefined;
    const moved = { ...p, position: to };
    this.pieces.set(id, moved);
    return { ...moved };
  }

  // Is square occupied by a living piece
  isOccupied(position: Position): boolean {
    return Array.from(this.pieces.values()).some(p => p.position === position);
  }

  // Clear board
  destroy(): void {
    this.pieces.clear();
  }

  // Clone board
  clone(): Board {
    return new Board(this.getPieces());
  }

  // Simple text representation
  toString(): string {
    const pieces = this.getPieces();
    return pieces
      .map(p => `${p.id}:${p.type}:${p.color}:${p.position ?? 'captured'}`)
      .join(' ');
  }
}
