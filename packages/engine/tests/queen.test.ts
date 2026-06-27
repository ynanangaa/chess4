import { describe, expect, it } from '@jest/globals';
import { Queen } from '../src/pieces/queen';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Queen movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const queen = new Queen('q1', PlayerColor.RED, null);
    const board = new Board([queen]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  it('returns straight and diagonal moves when the squares are empty', () => {
    const queen = new Queen('q1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([queen]);

    const moves = queen.getPseudoLegalMoves(board);

    // Horizontal and vertical
    expect(moves).toContainEqual(createPosition('e', 5));
    expect(moves).toContainEqual(createPosition('e', 3));
    expect(moves).toContainEqual(createPosition('d', 4));
    expect(moves).toContainEqual(createPosition('f', 4));

    // Diagonals
    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).toContainEqual(createPosition('f', 3));
    expect(moves).toContainEqual(createPosition('d', 3));
    expect(moves).toContainEqual(createPosition('f', 5));
  });

  it('does not include theoretically valid moves on invalid squares', () => {
    const queen = new Queen('q1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([queen]);

    const moves = queen.getPseudoLegalMoves(board);

    // c2 is in excluded corner (c,2) and is theoretically reachable diagonally
    expect(moves).not.toContainEqual(createPosition('c', 2));
  });

  it('stops before a friendly piece', () => {
    const queen = new Queen('q1', PlayerColor.RED, createPosition('e', 4));
    const friendly = new Pawn('p1', PlayerColor.RED, createPosition('e', 5));
    const board = new Board([queen, friendly]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).not.toContainEqual(createPosition('e', 5));
    expect(moves).not.toContainEqual(createPosition('e', 6));
  });

  it('includes capturing an enemy piece but stops there', () => {
    const queen = new Queen('q1', PlayerColor.RED, createPosition('e', 4));
    const enemy = new Pawn('p1', PlayerColor.YELLOW, createPosition('d', 5));
    const board = new Board([queen, enemy]);

    const moves = queen.getPseudoLegalMoves(board);

    expect(moves).toContainEqual(createPosition('d', 5));
    expect(moves).not.toContainEqual(createPosition('c', 6));
  });

  it('only includes valid board positions', () => {
    const queen = new Queen('q1', PlayerColor.RED, createPosition('e', 4));
    const board = new Board([queen]);

    const moves = queen.getPseudoLegalMoves(board);

    for (const move of moves) {
      expect(board.isValidPosition(move)).toBe(true);
    }
  });
});
