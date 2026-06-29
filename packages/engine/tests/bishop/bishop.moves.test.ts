import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { Bishop } from '../../src/pieces/bishop';
import { Pawn } from '../../src/pieces/pawn';
import { PlayerColor } from '../../src/players/player-color';
import { Position } from '../../src/position/position';
import { place } from '../tests-utils';

function sortMoves(moves: Position[]): Position[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}

describe('Bishop pseudo legal moves', () => {
  test('moves diagonally on an empty board', () => {
    const bishop = place(new Bishop(PlayerColor.RED, true), 7, 'g');
    const board = new Board([bishop]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).toContainEqual({ row: 8, col: 'h' });
    expect(moves).toContainEqual({ row: 9, col: 'i' });
    expect(moves).toContainEqual({ row: 6, col: 'h' });
    expect(moves).toContainEqual({ row: 8, col: 'f' });
  });

  test('stops before a friendly piece', () => {
    const bishop = place(new Bishop(PlayerColor.RED, true), 7, 'g');
    const ally = place(new Pawn(PlayerColor.RED, 1), 5, 'e');
    const board = new Board([bishop, ally]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 6, col: 'f' });
    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });

  test('captures an enemy piece and stops there', () => {
    const bishop = place(new Bishop(PlayerColor.RED, true), 7, 'g');
    const enemy = place(new Pawn(PlayerColor.BLUE, 1), 5, 'e');
    const board = new Board([bishop, enemy]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'e' });
    expect(moves).not.toContainEqual({ row: 4, col: 'd' });
  });
});
