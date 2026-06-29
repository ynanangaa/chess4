import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { Knight } from '../../src/pieces/knight';
import { Pawn } from '../../src/pieces/pawn';
import { PlayerColor } from '../../src/players/player-color';
import { Position } from '../../src/position/position';
import { place } from '../tests-utils';

function sortMoves(moves: Position[]): Position[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}

describe('Knight pseudo legal moves', () => {
  test('returns the 8 L-shaped moves from the center', () => {
    const knight = place(new Knight(PlayerColor.RED, true), 4, 'f');
    const board = new Board([knight]);

    expect(sortMoves(knight.getPseudoLegalMoves(board))).toEqual(sortMoves([
      { row: 2, col: 'e' },
      { row: 2, col: 'g' },
      { row: 3, col: 'd' },
      { row: 3, col: 'h' },
      { row: 5, col: 'd' },
      { row: 5, col: 'h' },
      { row: 6, col: 'e' },
      { row: 6, col: 'g' },
    ]));
  });

  test('handles edge positions without leaving the board', () => {
    const knight = place(new Knight(PlayerColor.RED, true), 1, 'd');
    const board = new Board([knight]);

    expect(sortMoves(knight.getPseudoLegalMoves(board))).toEqual(sortMoves([
      { row: 2, col: 'f' },
      { row: 3, col: 'e' },
    ]));
  });

  test('does not include corner-adjacent invalid squares', () => {
    const knight = place(new Knight(PlayerColor.RED, true), 4, 'a');
    const board = new Board([knight]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual({ row: 2, col: 'b' });
    expect(moves).not.toContainEqual({ row: 2, col: 'a' });
  });

  test('jumps over pieces and does not capture a friendly piece', () => {
    const knight = place(new Knight(PlayerColor.RED, true), 4, 'e');
    const ally = place(new Pawn(PlayerColor.RED, 1), 3, 'g');
    const board = new Board([knight, ally]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual({ row: 3, col: 'g' });
  });

  test('captures an enemy piece', () => {
    const knight = place(new Knight(PlayerColor.RED, true), 4, 'e');
    const enemy = place(new Pawn(PlayerColor.BLUE, 1), 3, 'g');
    const board = new Board([knight, enemy]);

    const moves = knight.getPseudoLegalMoves(board);

    expect(moves).toContainEqual({ row: 3, col: 'g' });
  });
});
