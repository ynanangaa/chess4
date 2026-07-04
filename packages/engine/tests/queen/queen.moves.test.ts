import { describe, expect, test } from '@jest/globals';

import { Board, buildQueen, buildDuplicatePiece, parseSquareCoords, Color, PieceType, queenMoves } from '../../src';
import { sortMoves } from '../test-utils';

describe('Queen pseudo legal moves', () => {
  test('moves horizontally, vertically, and diagonally on an empty area', () => {
    const queen = buildQueen(Color.RED);
    const board = new Board([[queen], [90]]);

    const moves = queenMoves(queen, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 1, col: 'g' });
    expect(moves).toContainEqual({ row: 7, col: 'f' });
    expect(moves).toContainEqual({ row: 7, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'g' });
    expect(moves).toContainEqual({ row: 8, col: 'g' });
  });

  test('stops before a friendly piece', () => {
    const queen = buildQueen(Color.RED);
    const ally = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, false);
    const board = new Board([[queen, ally], [90, 88]]);

    const moves = queenMoves(queen, board).map(pos => parseSquareCoords(pos));

    expect(moves).not.toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });

  test('captures an enemy piece and stops there', () => {
    const queen = buildQueen(Color.RED);
    const enemy = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);
    const board = new Board([[queen, enemy], [90, 88]]);

    const moves = queenMoves(queen, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });
});
