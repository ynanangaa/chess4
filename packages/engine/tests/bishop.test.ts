import { describe, expect, it } from '@jest/globals';
import { Bishop } from '../src/pieces/bishop';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Bishop movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, null);
    const board = new Board([bishop]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  it('returns diagonal moves when the squares are empty', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([bishop]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).toContainEqual(createPosition('f', 5));
    expect(moves).toContainEqual(createPosition('d', 3));
    expect(moves).toContainEqual(createPosition('f', 3));
  });

  it('does not include theoretically valid moves on invalid squares', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([bishop]);

    const moves = bishop.getPseudoLegalMoves(board);

    // These are theoretically valid diagonal moves but on invalid corner squares
    // c2 is in excluded corner (c,2)
    expect(moves).not.toContainEqual(createPosition('c', 2));
  });

  it('stops before a friendly piece', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, createPosition('e', 4));
    const friendly = new Pawn('p1', PlayerColor.RED, createPosition('d', 5));
    const board = new Board([bishop, friendly]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual(createPosition('d', 5));
    expect(moves).not.toContainEqual(createPosition('c', 6));
  });

  it('includes capturing an enemy piece but stops there', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, createPosition('e', 4));
    const enemy = new Pawn('p1', PlayerColor.YELLOW, createPosition('d', 5));
    const board = new Board([bishop, enemy]);

    const moves = bishop.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).not.toContainEqual(createPosition('c', 6));
  });

  it('only includes valid board positions', () => {
    const bishop = new Bishop('b1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([bishop]);

    const moves = bishop.getPseudoLegalMoves(board);

    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
  });
});
