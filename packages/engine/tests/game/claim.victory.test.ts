import { beforeEach, describe, expect, test } from '@jest/globals';

import {
  Color,
  Game,
  parseSquareId,
  PieceType,
} from '../../src';
import { 
  buildDuplicatePiece, 
  buildKing, 
  createDuplicatePieceId, 
  createPieceId 
} from "../../src/utils/utils";
import { advanceToPlayer, createClassicGame, eliminate, findMoveTo } from '../test-utils';

describe('Claim victory', () => {
  let game: Game;

  function move(pieceId: string, row: number, col: number): void {
    const to = parseSquareId(row, col);
    const legalMove = findMoveTo(game, pieceId, to);

    expect(game.advanceTurn(legalMove!)).toBe(true);
  }

  beforeEach(() => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, false);
    const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);

    const blueKing = buildKing(Color.BLUE);
    const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);

    game = createClassicGame([
      [
        redKing,
        redBishop,
        redKnight,
        blueKing,
        blueKnight
      ],
      [
        parseSquareId(1, 8),
        parseSquareId(11, 1),
        parseSquareId(3, 7),
        parseSquareId(8, 1),
        parseSquareId(5, 8)
      ]
    ]);
    eliminate(Color.YELLOW, game);
    eliminate(Color.GREEN, game);
  });

  test('cannot claim victory with less than a 21-point lead', () => {
    game.incrementPlayerScore(Color.RED, 15);

    // +3 points for capturing the remaining knight.
    move(createDuplicatePieceId(Color.RED, PieceType.KNIGHT, true), 5, 8);

    expect(game.getPlayer(Color.RED).getScore()).toBe(18);

    // BLUE king plays.
    move(createPieceId(Color.BLUE, PieceType.KING), 8, 2);

    advanceToPlayer(game, Color.RED);

    expect(game.claimVictory(Color.RED)).toBe(false);

    expect(game.getCurrentPlayerColor()).toBe(Color.RED);
    expect(game.isOver()).toBe(false);
  });

  test('cannot claim victory with exactly a 20-point lead', () => {
    game.incrementPlayerScore(Color.RED, 20);

    advanceToPlayer(game, Color.RED);

    expect(game.claimVictory(Color.RED)).toBe(false);

    expect(game.getCurrentPlayerColor()).toBe(Color.RED);
    expect(game.isOver()).toBe(false);
  });

  test('claims victory immediately with a lead of at least 21 points', () => {
    game.incrementPlayerScore(Color.RED, 20);

    // +3 points for capturing the remaining knight.
    move(createDuplicatePieceId(Color.RED, PieceType.KNIGHT, true), 5, 8);

    expect(game.getPlayer(Color.RED).getScore()).toBe(23);

    // BLUE king plays.
    move(createPieceId(Color.BLUE, PieceType.KING), 8, 2);

    advanceToPlayer(game, Color.RED);
    
    expect(game.claimVictory(Color.RED)).toBe(true);

    expect(game.isOver()).toBe(true);

    expect(game.getPlayer(Color.RED).getScore()).toBe(23);
    expect(game.getPlayer(Color.BLUE).getScore()).toBe(20);
  });
});