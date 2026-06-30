import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { clearBoardExcept, sortMoves } from '../test-utils';

let board: Board;

beforeEach(() => {
  board = new Board();
});

describe('King pseudo legal moves', () => {
  test('returns the 8 surrounding squares from the center', () => {
    const king = board.setPiece("K-red", 59);
    clearBoardExcept(board, "K-red");

    expect(sortMoves(king!.getStandardMoves(board))).toEqual(sortMoves([
      { row: 3, col: 'd' },
      { row: 3, col: 'e' },
      { row: 3, col: 'f' },
      { row: 4, col: 'd' },
      { row: 4, col: 'f' },
      { row: 5, col: 'd' },
      { row: 5, col: 'e' },
      { row: 5, col: 'f' },
    ]));
  });

  test('handles edge positions without including invalid squares', () => {
    const king = board.setPiece("K-red", 42);
    clearBoardExcept(board, "K-red");

    expect(sortMoves(king!.getStandardMoves(board))).toEqual(sortMoves([
      { row: 1, col: 'e' },
      { row: 2, col: 'd' },
      { row: 2, col: 'e' },
    ]));
  });

  test('does not include corner-adjacent invalid squares', () => {
    const king = board.setPiece("K-red", 31);
    clearBoardExcept(board, "K-red");

    const moves = king?.getStandardMoves(board);

    expect(moves).not.toContainEqual({ row: 3, col: 'c' });
    expect(moves).not.toContainEqual({ row: 2, col: 'c' });
    expect(moves).not.toContainEqual({ row: 1, col: 'c' });
  });

  test('does not move onto a friendly piece', () => {
    const king = board.setPiece("K-red", 59);
    const ally = board.setPiece("red-1", 60);
    clearBoardExcept(board, "K-red", "red-1");

    const moves = king?.getStandardMoves(board);

    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
  });

  test('captures an enemy piece', () => {
    const king = board.setPiece("K-red", 59);
    const enemy = board.setPiece("blue-1", 60);
    clearBoardExcept(board, "K-red", "blue-1");

    const moves = king?.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'e' });
  });
});
