import { describe, expect, test } from '@jest/globals';

import {
  Color,
  Game,
  GameStatus,
  parseSquareId,
  PieceType,
  PlayerState
} from '../../src';
import { 
  buildDuplicatePiece, 
  buildKing, 
  buildPawn,
  buildQueen 
} from "../../src/utils/utils";

import { advanceToPlayer, createClassicGame, findMoveTo } from '../test-utils';

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
    expect(game.advanceTurn(redMove!)).toBe(true);
    expectRunningNormalState(game);

    const blueMove = findMoveTo(game, bluePawn.id, parseSquareId(9, 4));
    expect(blueMove).toBeDefined();
    expect(game.advanceTurn(blueMove!)).toBe(true);
    expectRunningNormalState(game);

    const yellowMove = findMoveTo(game, yellowPawn.id, parseSquareId(12, 9));
    expect(yellowMove).toBeDefined();
    expect(game.advanceTurn(yellowMove!)).toBe(true);
    expectRunningNormalState(game);

    const checkingMove = findMoveTo(game, greenRook.id, parseSquareId(1, 11));
    expect(checkingMove).toBeDefined();
    expect(game.advanceTurn(checkingMove!)).toBe(true);

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

    advanceToPlayer(game, Color.GREEN);

    expect(queenMove).toBeDefined();
    expect(game.advanceTurn(queenMove!)).toBe(true);
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

    advanceToPlayer(game, Color.GREEN);

    expect(queenMove).toBeDefined();
    expect(game.advanceTurn(queenMove!)).toBe(true);
    expect(game.getLegalMoves(redKing.id)).toEqual([]);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.STALEMATE);
  });

  test("delays checkmate until the checked player's turn", () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const blueKing = buildKing(Color.BLUE);
    const blueQueen = buildQueen(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const yellowKnight = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, true);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [
        redKing,
        redBishop,
        blueKing,
        blueQueen,
        yellowKing,
        yellowKnight,
        greenKing,
        greenRook
      ],
      [
        parseSquareId(1, 7),
        parseSquareId(3, 5),
        parseSquareId(10, 1),
        parseSquareId(3, 8),
        parseSquareId(14, 8),
        parseSquareId(12, 9),
        parseSquareId(7, 14),
        parseSquareId(1, 11)
      ]
    ]);

    // BLUE delivers a theoretical checkmate.
    const queenMove = findMoveTo(game, blueQueen.id, parseSquareId(2, 7));

    advanceToPlayer(game, Color.BLUE);

    expect(queenMove).toBeDefined();
    expect(game.advanceTurn(queenMove!)).toBe(true);

    // RED remains in check until its next turn.
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);

    // YELLOW plays a neutral move.
    const yellowMove = findMoveTo(game, yellowKnight.id, parseSquareId(10, 10));

    expect(yellowMove).toBeDefined();
    expect(game.advanceTurn(yellowMove!)).toBe(true);

    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);

    // GREEN also plays a neutral move.
    const greenMove = findMoveTo(game, greenRook.id, parseSquareId(2, 11));

    expect(greenMove).toBeDefined();
    expect(game.advanceTurn(greenMove!)).toBe(true);

    // RED's turn begins, so the checkmate is now confirmed.
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECKMATE);
    expect(game.getLegalMoves(redBishop.id)).toEqual([]);
    expect(game.getLegalMoves(redKing.id)).toEqual([]);
  });

  test("delays stalemate until the affected player's turn", () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const blueQueen = buildQueen(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const yellowKnight = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, true);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [
        redKing,
        blueKing,
        blueQueen,
        yellowKing,
        yellowKnight,
        greenKing,
        greenRook
      ],
      [
        parseSquareId(1, 7),
        parseSquareId(10, 1),
        parseSquareId(3, 8),
        parseSquareId(14, 8),
        parseSquareId(12, 9),
        parseSquareId(8, 14),
        parseSquareId(12, 11)
      ]
    ]);

    // BLUE creates a theoretical stalemate.
    const queenMove = findMoveTo(game, blueQueen.id, parseSquareId(2, 9));

    advanceToPlayer(game, Color.BLUE);

    expect(queenMove).toBeDefined();
    expect(game.advanceTurn(queenMove!)).toBe(true);

    // RED is still considered active until its turn.
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);

    const yellowMove = findMoveTo(game, yellowKnight.id, parseSquareId(10, 10));

    expect(yellowMove).toBeDefined();
    expect(game.advanceTurn(yellowMove!)).toBe(true);

    const greenMove = findMoveTo(game, greenRook.id, parseSquareId(12, 6));

    expect(greenMove).toBeDefined();
    expect(game.advanceTurn(greenMove!)).toBe(true);

    // RED's turn begins, so the stalemate is now confirmed.
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.STALEMATE);
    expect(game.getLegalMoves(redKing.id)).toEqual([]);
  });

  test("cancels pending checkmate before the checked player's turn", () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const blueKing = buildKing(Color.BLUE);
    const blueQueen = buildQueen(Color.BLUE);
    const blueRook = buildDuplicatePiece(Color.BLUE, PieceType.ROOK, false);
    const yellowKing = buildKing(Color.YELLOW);
    const yellowKnight = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, true);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [
        redKing,
        redBishop,
        blueKing,
        blueQueen,
        blueRook,
        yellowKing,
        yellowKnight,
        greenKing,
        greenRook
      ],
      [
        parseSquareId(1, 7),
        parseSquareId(3, 5),
        parseSquareId(10, 1),
        parseSquareId(3, 8),
        parseSquareId(2, 4),
        parseSquareId(14, 8),
        parseSquareId(1, 9),
        parseSquareId(7, 14),
        parseSquareId(2, 11)
      ]
    ]);

    // BLUE delivers a theoretical checkmate.
    const queenMove = findMoveTo(game, blueQueen.id, parseSquareId(2, 7));

    advanceToPlayer(game, Color.BLUE);

    expect(queenMove).toBeDefined();
    expect(game.advanceTurn(queenMove!)).toBe(true);

    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);

    // YELLOW removes the mating threat.
    const yellowMove = findMoveTo(game, yellowKnight.id, parseSquareId(2, 7));

    expect(yellowMove).toBeDefined();
    expect(game.advanceTurn(yellowMove!)).toBe(true);

    // GREEN plays a neutral move.
    const greenMove = findMoveTo(game, greenKing.id, parseSquareId(8, 14));

    expect(greenMove).toBeDefined();
    expect(game.advanceTurn(greenMove!)).toBe(true);

    // RED is no longer checkmated when its turn begins.
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
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
