import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { clearBoardExcept, sortMoves } from '../test-utils';

let board: Board;

beforeEach(() => {
  board = new Board();
});

describe('Queen pseudo legal moves', () => {
  test('moves horizontally, vertically, and diagonally on an empty area', () => {
    const queen = board.setPiece("Q-red", 90);
    clearBoardExcept(board, "Q-red");

    const moves = queen!.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 1, col: 'g' });
    expect(moves).toContainEqual({ row: 7, col: 'f' });
    expect(moves).toContainEqual({ row: 7, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'g' });
    expect(moves).toContainEqual({ row: 8, col: 'g' });
  });

  test('stops before a friendly piece', () => {
    const queen = board.setPiece("Q-red", 90);
    const ally = board.setPiece("N-red-queenside", 88);
    clearBoardExcept(board, "Q-red", "N-red-queenside");

    const moves = queen?.getStandardMoves(board);

    expect(moves).not.toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });

  test('captures an enemy piece and stops there', () => {
    const queen = board.setPiece("Q-red", 90);
    const enemy = board.setPiece("N-blue-kingside", 88);
    clearBoardExcept(board, "Q-red", "N-blue-kingside");

    const moves = queen?.getStandardMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });
});
