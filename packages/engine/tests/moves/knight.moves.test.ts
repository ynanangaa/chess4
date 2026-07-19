import { describe, expect, test } from '@jest/globals';

import { Board, buildDuplicatePiece, buildPawn, parseSquareCoords, Color, PieceType, knightMoves } from '../../src';
import { sortMoves } from '../test-utils';

describe('Knight pseudo legal moves', () => {
  test('returns the 8 L-shaped moves from the center', () => {
    const knight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, false);
    const board = new Board([[knight], [120]]);

    const moves = knightMoves(knight, 120, board).map(pos => parseSquareCoords(pos));
    expect(sortMoves(moves)).toEqual(sortMoves([
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
    const knight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, false);
    const board = new Board([[knight], [42]]);

    const moves = knightMoves(knight, 42, board).map(pos => parseSquareCoords(pos));
    // Knight at (row 1, col 'e') can jump to 4 valid squares on this board
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ row: 2, col: 'f' });
    expect(moves).toContainEqual({ row: 3, col: 'e' });
  });

  test('does not include corner-adjacent invalid squares', () => {
    const knight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, false);
    const board = new Board([[knight], [3]]);

    const moves = knightMoves(knight, 3, board).map(pos => parseSquareCoords(pos));

    expect(moves).not.toContainEqual({ row: 2, col: 'b' });
    expect(moves).not.toContainEqual({ row: 2, col: 'a' });
  });

  test('jumps over pieces and does not capture a friendly piece', () => {
    const knight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
    const ally = buildPawn(Color.RED, 1);
    const board = new Board([[knight, ally], [59, 86]]);

    const moves = knightMoves(knight, 59, board).map(pos => parseSquareCoords(pos));

    expect(moves).not.toContainEqual({ row: 3, col: 'g' });
  });

  test('captures an enemy piece', () => {
    const knight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
    const enemy = buildPawn(Color.BLUE, 1);
    const board = new Board([[knight, enemy], [59, 86]]);

    const moves = knightMoves(knight, 59, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 3, col: 'g' });
  });
});
