import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { sortMoves } from '../test-utils';

var board = new Board();

describe('Knight pseudo legal moves', () => {
  test('returns the 8 L-shaped moves from the center', () => {
    const knight = board.setPiece("N-red-queenside", 120);

    expect(sortMoves(knight!.getStandardMoves(board))).toEqual(sortMoves([
      { row: 7, col: 'h' },
      { row: 7, col: 'j' },
      { row: 8, col: 'g' },
      { row: 8, col: 'k' },
      { row: 10, col: 'g' },
      { row: 10, col: 'k' },
      { row: 11, col: 'h' },
      { row: 11, col: 'j' },
    ]));
  });

  test('handles edge positions without leaving the board', () => {
    const knight = board.setPiece("N-blue-queenside", 42);

    expect(sortMoves(knight!.getStandardMoves(board))).toEqual(sortMoves([
      { row: 2, col: 'f' },
      { row: 3, col: 'e' },
    ]));
  });

  test('does not include corner-adjacent invalid squares', () => {
    const knight = board.setPiece("N-blue-queenside", 3);

    const moves = knight?.getStandardMoves(board);

    expect(moves).not.toContainEqual({ row: 2, col: 'b' });
    expect(moves).not.toContainEqual({ row: 2, col: 'a' });
  });

  test('jumps over pieces and does not capture a friendly piece', () => {
    const knight = board.setPiece("N-red-kingside", 59);
    const ally = board.setPiece("red-1", 86);

    const moves = knight?.getStandardMoves(board);

    expect(moves).not.toContainEqual({ row: 3, col: 'g' });
  });

  test('captures an enemy piece', () => {
    const knight = board.setPiece("N-red-kingside", 59);
    const enemy = board.setPiece("blue-1", 86);

    const moves = knight?.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 3, col: 'g' });
  });
});
