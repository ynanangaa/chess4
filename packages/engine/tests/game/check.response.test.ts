import { describe, expect, test } from '@jest/globals';

import {
  buildDuplicatePiece,
  buildKing,
  Color,
  parseSquareId,
  PieceType,
  PlayerState
} from '../../src';
import { advanceToPlayer, createClassicGame, findMoveTo } from '../test-utils';

describe('Game check responses', () => {
  test('allows interposition against a rook check', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, false);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [redKing, redBishop, redRook, blueKing, yellowKing, greenKing, greenRook],
      [
        parseSquareId(1, 8),
        parseSquareId(3, 7),
        parseSquareId(1, 4),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(8, 14),
        parseSquareId(7, 11)
      ]
    ]);

    const greenRookMove = findMoveTo(game, greenRook.id, parseSquareId(1, 11));

    advanceToPlayer(game, Color.GREEN);

    expect(greenRookMove).toBeDefined();
    expect(game.advanceTurn(greenRookMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);

    const bishopMoves = game.getLegalMoves(redBishop.id);

    expect(bishopMoves).toContainEqual(
      expect.objectContaining({ to: parseSquareId(1, 9) })
    );
    expect(bishopMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 8) })
    );

    expect(game.getLegalMoves(redKing.id).some(move => move.castle === 'queenside')).toBe(false);
  });

  test('allows capture but no interposition against a knight check', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
    const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenKnight = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);

    const game = createClassicGame([
      [redKing, redBishop, redRook, redKnight, blueKing, yellowKing, greenKing, greenKnight],
      [
        parseSquareId(1, 7),
        parseSquareId(3, 5),
        parseSquareId(1, 11),
        parseSquareId(1, 9),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(4, 10)
      ]
    ]);

    const greenKnightMove = findMoveTo(game, greenKnight.id, parseSquareId(3, 8));

    advanceToPlayer(game, Color.GREEN);

    expect(greenKnightMove).toBeDefined();
    expect(game.advanceTurn(greenKnightMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);
    expect(game.getLegalMoves(redBishop.id)).toEqual([]);
    expect(game.getLegalMoves(redKnight.id)).toContainEqual(
      expect.objectContaining({ to: parseSquareId(3, 8) })
    );
    expect(game.getLegalMoves(redKing.id)).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 6) })
    );
    expect(game.getLegalMoves(redKing.id).some(move => move.castle === 'kingside')).toBe(false);
  });

  test('allows only king moves during double check', () => {
    const redKing = buildKing(Color.RED);
    const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const greenBishop = buildDuplicatePiece(Color.GREEN, PieceType.BISHOP, true);

    const game = createClassicGame([
      [redKing, redKnight, blueKing, yellowKing, greenKing, greenRook, greenBishop],
      [
        parseSquareId(1, 7),
        parseSquareId(3, 11),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(1, 11),
        parseSquareId(5, 11)
      ]
    ]);

    const bishopMove = findMoveTo(game, greenBishop.id, parseSquareId(3, 9));

    advanceToPlayer(game, Color.GREEN);

    expect(bishopMove).toBeDefined();
    expect(game.advanceTurn(bishopMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);
    expect(game.getLegalMoves(redKnight.id)).toEqual([]);
    expect(game.getLegalMoves(redKing.id).length).toBeGreaterThan(0);
  });

  test('filters king moves after a sliding check', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, greenRook],
      [
        parseSquareId(2, 7),
        parseSquareId(10, 1),
        parseSquareId(13, 9),
        parseSquareId(7, 14),
        parseSquareId(1, 11)
      ]
    ]);

    const rookMove = findMoveTo(game, greenRook.id, parseSquareId(1, 9));

    advanceToPlayer(game, Color.GREEN);

    expect(rookMove).toBeDefined();
    expect(game.advanceTurn(rookMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.YELLOW)).toBe(PlayerState.CHECK);

    const kingMoves = game.getLegalMoves(yellowKing.id);

    expect(kingMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(14, 9) })
    );
    expect(kingMoves).toContainEqual(
      expect.objectContaining({ to: parseSquareId(13, 8) })
    );
    expect(kingMoves.length).toBeGreaterThan(0);
    expect(kingMoves.length).toBeLessThan(8);
  });

  test('prevents the king from capturing a protected adjacent attacker', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, greenRook, blueKnight],
      [
        parseSquareId(1, 7),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(3, 7),
        parseSquareId(4, 8)
      ]
    ]);

    const rookMove = findMoveTo(game, greenRook.id, parseSquareId(2, 7));

    advanceToPlayer(game, Color.GREEN);

    expect(rookMove).toBeDefined();
    expect(game.advanceTurn(rookMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);
    expect(game.getLegalMoves(redKing.id)).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 7) })
    );
  });
});
