import { describe, expect, test } from '@jest/globals';

import { Board, parseSquareCoords, Color, PieceType } from '../../src';
import { bishopMoves } from '../../src/moves/bishop-moves';
import { buildDuplicatePiece, buildQueen } from "../../src/utils/utils";

describe('Bishop pseudo legal moves', () => {
  test('moves diagonally on an empty area', () => {
    const bishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const board = new Board([[bishop], [90]]);

    const moves = bishopMoves(bishop, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 9, col: 'i' });
    expect(moves).toContainEqual({ row: 6, col: 'h' });
    expect(moves).toContainEqual({ row: 8, col: 'f' });
  });

  test('stops before a friendly piece', () => {
    const bishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const ally = buildQueen(Color.RED);
    const board = new Board([[bishop, ally], [90, 60]]);

    const moves = bishopMoves(bishop, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });

  test('captures an enemy piece and stops there', () => {
    const bishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const enemy = buildQueen(Color.GREEN);
    const board = new Board([[bishop, enemy], [90, 60]]);

    const moves = bishopMoves(bishop, board).map(pos => parseSquareCoords(pos));

    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });
});
