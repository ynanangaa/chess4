import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { sortMoves } from '../test-utils';

var board = new Board();

describe('Bishop pseudo legal moves', () => {
  test('moves diagonally on an empty area', () => {
    const bishop = board.setPiece("B-red-kingside", 90);

    const moves = bishop!.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 9, col: 'i' });
    expect(moves).toContainEqual({ row: 6, col: 'h' });
    expect(moves).toContainEqual({ row: 8, col: 'f' });
  });

  test('stops before a friendly piece', () => {
    const bishop = board.setPiece("B-red-kingside", 90);
    const ally = board.setPiece("Q-red", 60);

    const moves = bishop?.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });

  test('captures an enemy piece and stops there', () => {
    const bishop = board.setPiece("B-red-kingside", 90);
    const enemy = board.setPiece("Q-green", 60);

    const moves = bishop?.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });
});
