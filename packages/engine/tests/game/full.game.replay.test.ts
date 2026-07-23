import { describe, expect, test } from '@jest/globals';

import {
  Color,
  createDuplicatePieceId,
  createPieceId,
  DefaultRuleSet,
  Game,
  MoveGenerator,
  parseSquareId,
  PieceType,
  PlayerState
} from '../../src';
import { findMoveTo } from '../test-utils';

describe('Game integration - full 4-player game replay', () => {
  test('replays a real game move by move and produces the expected outcome', () => {
    const game = new Game(new DefaultRuleSet(new MoveGenerator()));

    function move(pieceId: string, row: number, col: number): void {
      const to = parseSquareId(row, col);
      const legalMove = findMoveTo(game, pieceId, to);
      expect(game.advanceTurn(legalMove!)).toBe(true);
    }

    // --- Round 1 ---
    move('red-5', 4, 8);
    move('blue-3', 9, 4);
    move('yellow-3', 12, 9);
    expect(game.getLegalMoves('green-4')).toHaveLength(0);
    move('green-5', 8, 11);

    // --- Round 2 ---
    move('red-4', 4, 7);
    move('Q-blue', 9, 2);
    move('Q-yellow', 13, 9);
    move('N-green-kingside', 9, 12);

    // --- Round 3 ---
    move('B-red-queenside', 9, 14);
    const capturedGreenKingsideBishop = game.getCapturedPiece('B-green-kingside');
    expect(capturedGreenKingsideBishop).toBeDefined();
    expect(capturedGreenKingsideBishop?.capturedBy).toBe(Color.RED);

    move('blue-5', 7, 3);
    move('yellow-5', 12, 7);

    expect(
      game.getLegalMoves('K-green').find(m => m.castle === 'kingside')
    ).toBeUndefined();
    move('K-green', 9, 14);
    const capturedRedQueensideBishop = game.getCapturedPiece('B-red-queenside');
    expect(capturedRedQueensideBishop).toBeDefined();
    expect(capturedRedQueensideBishop?.capturedBy).toBe(Color.GREEN);

    // --- Round 4 ---
    move('red-6', 3, 9);
    move('blue-7', 5, 3);
    move('B-yellow-kingside', 13, 7);

    expect(
      game.getLegalMoves('K-green').some(m => m.castle !== undefined)
    ).toBe(false);
    move('N-green-queenside', 6, 12);

    // --- Round 5 ---
    move('red-3', 3, 6);

    move('B-blue-kingside', 2, 5);
    const capturedRedPawn2 = game.getCapturedPiece('red-2');
    expect(capturedRedPawn2).toBeDefined();
    expect(capturedRedPawn2?.capturedBy).toBe(Color.BLUE);

    move('B-yellow-kingside', 14, 8);
    move('green-4', 7, 11);

    // --- Round 6 ---
    move('N-red-kingside', 3, 11);
    move('Q-blue', 6, 5);

    move('Q-yellow', 9, 13);
    const capturedGreenPawn6 = game.getCapturedPiece('green-6');
    expect(capturedGreenPawn6).toBeDefined();
    expect(capturedGreenPawn6?.capturedBy).toBe(Color.YELLOW);

    // GREEN is CHECKMATE: its pieces are inactive, but its turn still exists
    // in the natural rotation and must be advanced explicitly.
    expect(game.getPlayerState(Color.GREEN)).toBe(PlayerState.CHECKMATE);
    expect(game.getCurrentPlayerColor()).toBe(Color.GREEN);
    expect(game.getBoard().getPiece('K-green')?.active).toBe(false);
    expect(game.getBoard().getPiece('Q-green')?.active).toBe(false);

    expect(game.advanceTurn()).toBe(true);
    expect(game.getCurrentPlayerColor()).toBe(Color.RED);

    // --- Round 7 (GREEN is eliminated, so its turn is consumed) ---
    move('N-red-kingside', 5, 12);
    move('blue-2', 10, 3);
    move('N-yellow-kingside', 12, 6);
    expect(game.getCurrentPlayerColor()).toBe(Color.GREEN);
    expect(game.advanceTurn()).toBe(true);
    expect(game.getCurrentPlayerColor()).toBe(Color.RED);

    // --- Round 8 (GREEN is eliminated, so its turn is consumed) ---
    move('N-red-kingside', 6, 14);
    const capturedGreenQueensideBishop = game.getCapturedPiece('B-green-queenside');
    expect(capturedGreenQueensideBishop).toBeDefined();
    expect(capturedGreenQueensideBishop?.capturedBy).toBe(Color.RED);

    move('B-blue-kingside', 1, 4);
    const capturedRedQueensideRook = game.getCapturedPiece('R-red-queenside');
    expect(capturedRedQueensideRook).toBeDefined();
    expect(capturedRedQueensideRook?.capturedBy).toBe(Color.BLUE);

    move('Q-yellow', 12, 10);
    expect(game.getCurrentPlayerColor()).toBe(Color.GREEN);
    expect(game.advanceTurn()).toBe(true);
    expect(game.getCurrentPlayerColor()).toBe(Color.RED);

    // ---------------------------------------------------------------------
    // RED resigns
    // ---------------------------------------------------------------------
    game.resignPlayer(Color.RED, true);
    expect(game.advanceTurn()).toBe(true);

    expect(
      game.getBoard().getPiece(createPieceId(Color.RED, PieceType.KING))!.active
    ).toBe(true);
    expect(
      game.getBoard().getPiece(createPieceId(Color.RED, PieceType.QUEEN))!.active
    ).toBe(false);
    expect(
      game.getBoard().getPiece(createDuplicatePieceId(Color.RED, PieceType.KNIGHT, true))!.active
    ).toBe(false);
    expect(game.getCurrentPlayerColor()).toBe(Color.BLUE);
    expect(game.isPlayerActive(Color.RED)).toBe(false);
    expect(game.isPlayerActive(Color.GREEN)).toBe(false);
    expect(game.isPlayerActive(Color.BLUE)).toBe(true);
    expect(game.isPlayerActive(Color.YELLOW)).toBe(true);

    // ---------------------------------------------------------------------
    // Final ranking
    // ---------------------------------------------------------------------
    const playersRanking = game.rankPlayersByScore();

    expect(playersRanking[0].getColor()).toBe(Color.YELLOW);
    expect(playersRanking[0].getScore()).toBe(21);

    expect(playersRanking[1].getColor()).toBe(Color.BLUE);
    expect(playersRanking[1].getScore()).toBe(6);

    expect(playersRanking[2].getColor()).toBe(Color.RED);
    expect(playersRanking[2].getScore()).toBe(5);

    expect(playersRanking[3].getColor()).toBe(Color.GREEN);
    expect(playersRanking[3].getScore()).toBe(5);
  });
});
