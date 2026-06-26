import { describe, expect, it } from '@jest/globals';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Pawn movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns one forward move when the square is empty', () => {
    const pawn = new Pawn('p1', PlayerColor.RED, createPosition('e', 2));
    const board = new Board([pawn]);

    const moves = pawn.getPseudoLegalMoves(board);

    expect(moves).toEqual([createPosition('e', 3)]);
  });

  it('returns diagonal capture moves for an opposing piece', () => {
    const pawn = new Pawn('p1', PlayerColor.RED, createPosition('e', 2));
    const enemy = new Pawn('p2', PlayerColor.YELLOW, createPosition('d', 3));
    const board = new Board([pawn, enemy]);

    const moves = pawn.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 3));
  });
});
