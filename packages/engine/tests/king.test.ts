import { describe, expect, it } from '@jest/globals';
import { King } from '../src/pieces/king';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('King movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const king = new King('k1', PlayerColor.RED, null);
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  it('returns all adjacent moves when the squares are empty', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).toContainEqual(createPosition('d', 4));
    expect(moves).toContainEqual(createPosition('d', 3));
    expect(moves).toContainEqual(createPosition('e', 5));
    expect(moves).toContainEqual(createPosition('e', 3));
    expect(moves).toContainEqual(createPosition('f', 5));
    expect(moves).toContainEqual(createPosition('f', 4));
    expect(moves).toContainEqual(createPosition('f', 3));
  });

  it('does not include theoretically valid moves on invalid squares', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('c', 4));
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    // c3, c2, c1 are all invalid corner squares
    // King moving adjacent from c4 should not reach these
    expect(moves).not.toContainEqual(createPosition('c', 3));
    expect(moves).not.toContainEqual(createPosition('c', 2));
    expect(moves).not.toContainEqual(createPosition('c', 1));
  });

  it('does not include moves with friendly pieces', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('e', 4));
    const friendly = new Pawn('p1', PlayerColor.RED, createPosition('d', 5));
    const board = new Board([king, friendly]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual(createPosition('d', 5));
    expect(moves).toContainEqual(createPosition('e', 5));
  });

  it('includes capturing an enemy piece', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('e', 4));
    const enemy = new Pawn('p1', PlayerColor.YELLOW, createPosition('d', 5));
    const board = new Board([king, enemy]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 5));
  });

  it('only includes valid board positions', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
  });

  it('handles edge positions correctly', () => {
    const king = new King('k1', PlayerColor.RED, createPosition('d', 4));
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    // All returned positions should be valid
    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
    // Should not be empty
    expect(moves.length).toBeGreaterThan(0);
    // Should not exceed 8 adjacent squares
    expect(moves.length).toBeLessThanOrEqual(8);
  });
});
