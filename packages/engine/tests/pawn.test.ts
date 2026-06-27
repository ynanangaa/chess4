import { describe, expect, it } from '@jest/globals';
import { Pawn } from '../src/pieces/pawn';
import { PlayerColor } from '../src/players/player-color';
import { Board } from '../src/board/board';
import { Position } from '../src/position/position';

describe('Pawn movement', () => {
  const createPosition = (col: string, row: number): Position => ({ col, row });

  it('returns empty array when piece is not on the board', () => {
    const pawn = new Pawn('p1', PlayerColor.RED, null);
    const board = new Board([pawn]);

    const moves = pawn.getPseudoLegalMoves(board);

    expect(moves).toEqual([]);
  });

  describe('RED pawn', () => {
    it('returns one forward move (row+1) when the square is empty', () => {
      const pawn = new Pawn('p1', PlayerColor.RED, createPosition('e', 4));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toEqual([createPosition('e', 5)]);
    });

    it('returns diagonal capture moves for opposing pieces', () => {
      const pawn = new Pawn('p1', PlayerColor.RED, createPosition('e', 4));
      const enemy1 = new Pawn('p2', PlayerColor.YELLOW, createPosition('d', 5));
      const enemy2 = new Pawn('p3', PlayerColor.YELLOW, createPosition('f', 5));
      const board = new Board([pawn, enemy1, enemy2]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toContainEqual(createPosition('d', 5));
      expect(moves).toContainEqual(createPosition('f', 5));
    });

    it('does not include invalid board positions', () => {
      const pawn = new Pawn('p1', PlayerColor.RED, createPosition('e', 4));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      // Verify all moves are valid positions
      for (const move of moves) {
        expect(board.isValidPosition(move)).toBe(true);
      }
    });
  });

  describe('YELLOW pawn', () => {
    it('returns one forward move (row-1) when the square is empty', () => {
      const pawn = new Pawn('p1', PlayerColor.YELLOW, createPosition('e', 10));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toEqual([createPosition('e', 9)]);
    });

    it('returns diagonal capture moves for opposing pieces', () => {
      const pawn = new Pawn('p1', PlayerColor.YELLOW, createPosition('e', 10));
      const enemy1 = new Pawn('p2', PlayerColor.RED, createPosition('d', 9));
      const enemy2 = new Pawn('p3', PlayerColor.RED, createPosition('f', 9));
      const board = new Board([pawn, enemy1, enemy2]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toContainEqual(createPosition('d', 9));
      expect(moves).toContainEqual(createPosition('f', 9));
    });

    it('does not move to theoretically valid squares on invalid corners', () => {
      const pawn = new Pawn('p1', PlayerColor.YELLOW, createPosition('c', 4));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      // c3 is theoretically forward for a YELLOW pawn but is in an invalid corner
      expect(moves).not.toContainEqual(createPosition('c', 3));
    });

    it('does not include invalid board positions', () => {
      const pawn = new Pawn('p1', PlayerColor.YELLOW, createPosition('e', 10));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      for (const move of moves) {
        expect(board.isValidPosition(move)).toBe(true);
      }
    });
  });

  describe('BLUE pawn', () => {
    it('returns one forward move (col+1) when the square is empty', () => {
      const pawn = new Pawn('p1', PlayerColor.BLUE, createPosition('d', 7));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toEqual([createPosition('e', 7)]);
    });

    it('returns diagonal capture moves for opposing pieces', () => {
      const pawn = new Pawn('p1', PlayerColor.BLUE, createPosition('d', 7));
      const enemy1 = new Pawn('p2', PlayerColor.RED, createPosition('e', 6));
      const enemy2 = new Pawn('p3', PlayerColor.RED, createPosition('e', 8));
      const board = new Board([pawn, enemy1, enemy2]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toContainEqual(createPosition('e', 6));
      expect(moves).toContainEqual(createPosition('e', 8));
    });

    it('does not include invalid board positions', () => {
      const pawn = new Pawn('p1', PlayerColor.BLUE, createPosition('d', 7));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      for (const move of moves) {
        expect(board.isValidPosition(move)).toBe(true);
      }
    });
  });

  describe('GREEN pawn', () => {
    it('returns one forward move (col-1) when the square is empty', () => {
      const pawn = new Pawn('p1', PlayerColor.GREEN, createPosition('h', 7));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toEqual([createPosition('g', 7)]);
    });

    it('returns diagonal capture moves for opposing pieces', () => {
      const pawn = new Pawn('p1', PlayerColor.GREEN, createPosition('h', 7));
      const enemy1 = new Pawn('p2', PlayerColor.RED, createPosition('g', 6));
      const enemy2 = new Pawn('p3', PlayerColor.RED, createPosition('g', 8));
      const board = new Board([pawn, enemy1, enemy2]);

      const moves = pawn.getPseudoLegalMoves(board);

      expect(moves).toContainEqual(createPosition('g', 6));
      expect(moves).toContainEqual(createPosition('g', 8));
    });

    it('does not include invalid board positions', () => {
      const pawn = new Pawn('p1', PlayerColor.GREEN, createPosition('h', 7));
      const board = new Board([pawn]);

      const moves = pawn.getPseudoLegalMoves(board);

      for (const move of moves) {
        expect(board.isValidPosition(move)).toBe(true);
      }
    });
  });
});
