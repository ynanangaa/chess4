import { describe, expect, test } from '@jest/globals';

import {
  buildDuplicatePiece,
  buildKing,
  buildPawn,
  buildQueen,
  Color,
  Game,
  GameStatus,
  parseSquareId,
  PieceType,
  PlayerState
} from '../../src';
import { createClassicGame, findMoveTo } from '../test-utils';

describe('Game state transitions', () => {
  test('keeps all players normal until a checking move is applied', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const redPawn = buildPawn(Color.RED, 4);
    const bluePawn = buildPawn(Color.BLUE, 4);
    const yellowPawn = buildPawn(Color.YELLOW, 4);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, redPawn, bluePawn, yellowPawn, greenRook],
      [
        parseSquareId(1, 7),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(2, 6),
        parseSquareId(9, 3),
        parseSquareId(13, 9),
        parseSquareId(7, 11)
      ]
    ]);

    expectRunningNormalState(game);

    const redMove = findMoveTo(game, redPawn.id, parseSquareId(3, 6));
    expect(redMove).toBeDefined();
    expect(game.applyMove(redMove!)).toBe(true);
    expectRunningNormalState(game);

    const blueMove = findMoveTo(game, bluePawn.id, parseSquareId(9, 4));
    expect(blueMove).toBeDefined();
    expect(game.applyMove(blueMove!)).toBe(true);
    expectRunningNormalState(game);

    const yellowMove = findMoveTo(game, yellowPawn.id, parseSquareId(12, 9));
    expect(yellowMove).toBeDefined();
    expect(game.applyMove(yellowMove!)).toBe(true);
    expectRunningNormalState(game);

    const checkingMove = findMoveTo(game, greenRook.id, parseSquareId(1, 11));
    expect(checkingMove).toBeDefined();
    expect(game.applyMove(checkingMove!)).toBe(true);

    const state = game.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.CHECK);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);
  });

  test('detects checkmate', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenQueen = buildQueen(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [redKing, redBishop, blueKing, yellowKing, greenKing, greenQueen, greenRook],
      [
        parseSquareId(1, 7),
        parseSquareId(14, 11),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(3, 8),
        parseSquareId(2, 11)
      ]
    ]);

    const queenMove = findMoveTo(game, greenQueen.id, parseSquareId(2, 7));

    expect(queenMove).toBeDefined();
    expect(game.applyMove(queenMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECKMATE);
    expect(game.getLegalMoves(redBishop.id)).toEqual([]);
    expect(game.getLegalMoves(redKing.id)).toEqual([]);
  });

  test('detects stalemate', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenQueen = buildQueen(Color.GREEN);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, greenQueen],
      [
        parseSquareId(1, 7),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(2, 5),
        parseSquareId(3, 9)
      ]
    ]);

    const queenMove = findMoveTo(game, greenQueen.id, parseSquareId(2, 9));

    expect(queenMove).toBeDefined();
    expect(game.applyMove(queenMove!)).toBe(true);
    expect(game.getLegalMoves(redKing.id)).toEqual([]);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.STALEMATE);
  });
});

function expectRunningNormalState(game: Game): void {
  const state = game.getGameState();

  expect(state.getStatus()).toBe(GameStatus.RUNNING);
  expect(state.getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
  expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
  expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
  expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);
}
