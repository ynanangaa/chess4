import { describe, expect, test } from '@jest/globals';

import { 
    ClassicRuleSet, Color, Game, GameStatus, 
    MoveGenerator, PieceType, PlayerState, 
    buildDuplicatePiece, buildKing, buildPawn, 
    parseSquareId 
} from '../../src';

describe('Game State Update', () => {
  test("updates game state after each move", () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const redPawn = buildPawn(Color.RED, 4);
    const bluePawn = buildPawn(Color.BLUE, 4);
    const yellowPawn = buildPawn(Color.YELLOW, 4);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        blueKing,
        yellowKing,
        greenKing,
        redPawn,
        bluePawn,
        yellowPawn,
        greenRook
      ], [
        parseSquareId(1, 7),   // red king
        parseSquareId(10, 1),  // blue king
        parseSquareId(14, 8),  // yellow king
        parseSquareId(7, 14),  // green king

        parseSquareId(2, 6),   // red pawn
        parseSquareId(9, 3),   // blue pawn
        parseSquareId(13, 9),  // yellow pawn
        parseSquareId(7, 11)   // green rook
      ]]
    );

    // Initial state
    let state = customGame.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);

    // RED
    const redMove = customGame
      .getLegalMoves(redPawn.id)
      .find(move => move.to === parseSquareId(3, 6));

    expect(redMove).toBeDefined();
    expect(customGame.applyMove(redMove!)).toBe(true);

    state = customGame.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);

    // BLUE
    const blueMove = customGame
      .getLegalMoves(bluePawn.id)
      .find(move => move.to === parseSquareId(9, 4));

    expect(blueMove).toBeDefined();
    expect(customGame.applyMove(blueMove!)).toBe(true);

    state = customGame.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);

    // YELLOW
    const yellowMove = customGame
      .getLegalMoves(yellowPawn.id)
      .find(move => move.to === parseSquareId(12, 9));

    expect(yellowMove).toBeDefined();
    expect(customGame.applyMove(yellowMove!)).toBe(true);

    state = customGame.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);

    // GREEN : rook gives check
    const checkingMove = customGame
      .getLegalMoves(greenRook.id)
      .find(move => move.to === parseSquareId(1, 11));

    expect(checkingMove).toBeDefined();
    expect(customGame.applyMove(checkingMove!)).toBe(true);

    state = customGame.getGameState();

    expect(state.getStatus()).toBe(GameStatus.RUNNING);
    expect(state.getPlayerState(Color.RED)).toBe(PlayerState.CHECK);
    expect(state.getPlayerState(Color.BLUE)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.YELLOW)).toBe(PlayerState.NORMAL);
    expect(state.getPlayerState(Color.GREEN)).toBe(PlayerState.NORMAL);
  });
})