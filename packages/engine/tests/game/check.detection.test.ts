import { describe, expect, test } from '@jest/globals';

import {
  Color,
  parseSquareId,
  PieceType,
  PlayerState
} from '../../src';
import { buildDuplicatePiece, buildKing } from "../../src/utils/utils";
import { advanceToPlayer, createClassicGame, findMoveTo } from '../test-utils';

describe('Game check detection', () => {
  test('records every king checked by a move', () => {
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const game = createClassicGame([
      [redRook, blueKing, yellowKing, greenKing],
      [
        parseSquareId(1, 4),
        parseSquareId(10, 4),
        parseSquareId(11, 13),
        parseSquareId(7, 7)
      ]
    ]);

    const checkingMove = findMoveTo(game, redRook.id, parseSquareId(7, 4));

    expect(checkingMove).toBeDefined();
    expect(game.advanceTurn(checkingMove!)).toBe(true);

    const history = game.getHistory();

    expect(history).toHaveLength(1);
    expect(history[0].check).toBeInstanceOf(Map);
    expect(history[0].check?.has(redRook.id)).toBe(true);
    expect(history[0].check?.get(redRook.id)).toContain(Color.BLUE);
    expect(history[0].check?.get(redRook.id)).not.toContain(Color.YELLOW);
    expect(history[0].check?.get(redRook.id)).toContain(Color.GREEN);
  });

  test('detects a discovered check after a blocking piece moves', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const greenKnight = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, greenRook, greenKnight],
      [
        parseSquareId(1, 7),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(1, 11),
        parseSquareId(1, 9)
      ]
    ]);

    const knightMove = findMoveTo(game, greenKnight.id, parseSquareId(3, 10));

    advanceToPlayer(game, Color.GREEN);

    expect(knightMove).toBeDefined();
    expect(game.advanceTurn(knightMove!)).toBe(true);
    expect(game.getGameState().getPlayerState(Color.RED)).toBe(PlayerState.CHECK);

    const history = game.getHistory();
    const lastMove = history[history.length - 1];

    expect(lastMove.check).toBeDefined();
    expect(lastMove.check!.has(greenRook.id)).toBe(true);
  });
});
