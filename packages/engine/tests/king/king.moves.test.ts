import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { King } from '../../src/pieces/king';
import { Pawn } from '../../src/pieces/pawn';
import { PlayerColor } from '../../src/players/player-color';
import { Position } from '../../src/position/position';
import { place } from '../tests-utils';

function sortMoves(moves: Position[]): Position[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}

describe('King pseudo legal moves', () => {
  test('returns the 8 surrounding squares from the center', () => {
    const king = place(new King(PlayerColor.RED), 4, 'e');
    const board = new Board([king]);

    expect(sortMoves(king.getPseudoLegalMoves(board))).toEqual(sortMoves([
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
    const king = place(new King(PlayerColor.RED), 1, 'd');
    const board = new Board([king]);

    expect(sortMoves(king.getPseudoLegalMoves(board))).toEqual(sortMoves([
      { row: 1, col: 'e' },
      { row: 2, col: 'd' },
      { row: 2, col: 'e' },
    ]));
  });

  test('does not include corner-adjacent invalid squares', () => {
    const king = place(new King(PlayerColor.RED), 4, 'c');
    const board = new Board([king]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual({ row: 3, col: 'c' });
    expect(moves).not.toContainEqual({ row: 2, col: 'c' });
    expect(moves).not.toContainEqual({ row: 1, col: 'c' });
  });

  test('does not move onto a friendly piece', () => {
    const king = place(new King(PlayerColor.RED), 4, 'e');
    const ally = place(new Pawn(PlayerColor.RED, 1), 5, 'e');
    const board = new Board([king, ally]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual({ row: 5, col: 'e' });
  });

  test('captures an enemy piece', () => {
    const king = place(new King(PlayerColor.RED), 4, 'e');
    const enemy = place(new Pawn(PlayerColor.BLUE, 1), 5, 'e');
    const board = new Board([king, enemy]);

    const moves = king.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 5, col: 'e' });
  });
});
