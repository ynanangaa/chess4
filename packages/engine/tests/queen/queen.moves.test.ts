import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { Pawn } from '../../src/pieces/pawn';
import { Queen } from '../../src/pieces/queen';
import { PlayerColor } from '../../src/players/player-color';
import { Position } from '../../src/position/position';
import { place } from '../tests-utils';

function sortMoves(moves: Position[]): Position[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}

describe('Queen pseudo legal moves', () => {
  test('moves horizontally, vertically, and diagonally on an empty board', () => {
    const queen = place(new Queen(PlayerColor.RED), 7, 'g');
    const board = new Board([queen]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 1, col: 'g' });
    expect(moves).toContainEqual({ row: 7, col: 'f' });
    expect(moves).toContainEqual({ row: 7, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 6, col: 'g' });
    expect(moves).toContainEqual({ row: 8, col: 'g' });
  });

  test('stops before a friendly piece', () => {
    const queen = place(new Queen(PlayerColor.RED), 7, 'g');
    const ally = place(new Pawn(PlayerColor.RED, 1), 5, 'g');
    const board = new Board([queen, ally]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });

  test('captures an enemy piece and stops there', () => {
    const queen = place(new Queen(PlayerColor.RED), 7, 'g');
    const enemy = place(new Pawn(PlayerColor.BLUE, 1), 5, 'g');
    const board = new Board([queen, enemy]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'g' });
    expect(moves).not.toContainEqual({ row: 4, col: 'g' });
  });
});
