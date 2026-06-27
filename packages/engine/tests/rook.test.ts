import { describe, expect, it } from '@jest/globals';
import { Rook } from '../src/pieces/rook';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Rook movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const rook = new Rook('r1', PlayerColor.RED, null);
    const board = new Board([rook]);

    const moves = rook.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  it('returns horizontal and vertical moves when the squares are empty', () => {
    const rook = new Rook('r1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([rook]);

    const moves = rook.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('e', 5));
    expect(moves).toContainEqual(createPosition('e', 3));
    expect(moves).toContainEqual(createPosition('d', 4));
    expect(moves).toContainEqual(createPosition('f', 4));
  });

  it('does not include theoretically valid moves on invalid squares', () => {
    const rook = new Rook('r1', PlayerColor.RED, createPosition('c', 4));
    const board = new Board([rook]);

    const moves = rook.getPseudoLegalMoves(board);

    // c3, c2, c1 are all invalid corner squares (c with rows 1,2,3)
    // Rook moving down from c4 should not be able to reach these
    expect(moves).not.toContainEqual(createPosition('c', 3));
    expect(moves).not.toContainEqual(createPosition('c', 2));
    expect(moves).not.toContainEqual(createPosition('c', 1));
  });

  it('stops before a friendly piece', () => {
    const rook = new Rook('r1', PlayerColor.RED, createPosition('e', 4));
    const friendly = new Pawn('p1', PlayerColor.RED, createPosition('e', 5));
    const board = new Board([rook, friendly]);

    const moves = rook.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual(createPosition('e', 5));
    expect(moves).not.toContainEqual(createPosition('e', 6));
  });

  it('includes capturing an enemy piece but stops there', () => {
    const rook = new Rook('r1', PlayerColor.RED, createPosition('e', 4));
    const enemy = new Pawn('p1', PlayerColor.YELLOW, createPosition('e', 2));
    const board = new Board([rook, enemy]);

    const moves = rook.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('e', 2));
    expect(moves).not.toContainEqual(createPosition('e', 1));
  });

  it('only includes valid board positions', () => {
    const rook = new Rook('r1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([rook]);

    const moves = rook.getPseudoLegalMoves(board);

    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
  });
});
