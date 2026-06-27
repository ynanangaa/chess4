import { describe, expect, it } from '@jest/globals';
import { Knight } from '../src/pieces/knight';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Knight movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const knight = new Knight('n1', PlayerColor.RED, null);
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  it('returns all L-shaped moves when the squares are empty', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('f', 4));
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('e', 6));
    expect(moves).toContainEqual(createPosition('g', 6));
    expect(moves).toContainEqual(createPosition('e', 2));
    expect(moves).toContainEqual(createPosition('g', 2));
    expect(moves).toContainEqual(createPosition('h', 5));
    expect(moves).toContainEqual(createPosition('h', 3));
    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).toContainEqual(createPosition('d', 3));
  });

  it('does not include theoretically valid moves on invalid squares', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    // c3 is theoretically valid for a knight at e4, but it's in an excluded corner (c,3)
    expect(moves).not.toContainEqual(createPosition('c', 3));
  });

  it('does not include moves with friendly pieces', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('e', 4));
    const friendly = new Pawn('p1', PlayerColor.RED, createPosition('d', 6));
    const board = new Board([knight, friendly]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual(createPosition('d', 6));
  });

  it('includes capturing an enemy piece', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('e', 4));
    const enemy = new Pawn('p1', PlayerColor.YELLOW, createPosition('d', 6));
    const board = new Board([knight, enemy]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 6));
  });

  it('only includes valid board positions', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
  });

  it('handles edge positions correctly', () => {
    const knight = new Knight('n1', PlayerColor.RED, createPosition('d', 4));
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    // All returned positions should be valid
    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
    // Should not be empty
    expect(moves.length).toBeGreaterThan(0);
  });
});
