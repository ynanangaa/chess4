import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board, buildKing, buildPawn, parseSquareCoords, Color, kingMoves } from '../../src';
import { sortMoves } from '../test-utils';

let board: Board;

beforeEach(() => {
  board = new Board();
});

describe('King pseudo legal moves', () => {
  test('returns the 8 surrounding squares from the center', () => {
    const king = buildKing(Color.RED);
    board = new Board([[king], [59]]);

    const moves = kingMoves(king, 59, board).map(pos => parseSquareCoords(pos));
    expect(sortMoves(moves)).toEqual(sortMoves([
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
    const king = buildKing(Color.RED);
    board = new Board([[king], [42]]);

    const moves = kingMoves(king, 42, board).map(pos => parseSquareCoords(pos));
    expect(sortMoves(moves)).toEqual(sortMoves([
      { row: 1, col: 'e' },
      { row: 2, col: 'd' },
      { row: 2, col: 'e' },
    ]));
  });

  test('does not include corner-adjacent invalid squares', () => {
    const king = buildKing(Color.RED);
    board = new Board([[king], [31]]);

    const moves = kingMoves(king, 31, board).map(pos => parseSquareCoords(pos));

    expect(moves).not.toContainEqual({ row: 3, col: 'c' });
    expect(moves).not.toContainEqual({ row: 2, col: 'c' });
    expect(moves).not.toContainEqual({ row: 1, col: 'c' });
  });

  test('does not move onto a friendly piece', () => {
    const king = buildKing(Color.RED);
    const ally = buildPawn(Color.RED, 1);
    board = new Board([[king, ally], [59, 60]]);

    const moves = kingMoves(king, 59, board).map(pos => parseSquareCoords(pos));

    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
  });

  test('captures an enemy piece', () => {
    const king = buildKing(Color.RED);
    const enemy = buildPawn(Color.BLUE, 1);
    board = new Board([[king, enemy], [59, 60]]);

    const moves = kingMoves(king, 59, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 5, col: 'e' });
  });
});
