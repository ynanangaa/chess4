import { describe, expect, test } from '@jest/globals';

import {
  Color,
  parseSquareId,
} from '../../src';
import { buildKing, buildQueen } from "../../src/utils/utils";
import { createClassicGame } from '../test-utils';

describe('Game turn advancement', () => {
  test('moves the wandering king when a resigned player is not mated or stalled', () => {
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const redStart = parseSquareId(5, 5);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing],
      [
        redStart,
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(8, 14)
      ]
    ]);

    game.resignPlayer(Color.RED);

    expect(game.advanceTurn()).toBe(true);
    expect(game.getCurrentPlayerColor()).toBe(Color.BLUE);
    expect(game.getHistory()).toHaveLength(1);
    expect(game.getBoard().getSquareOf(redKing.id)).not.toBe(redStart);
    expect(game.isPlayerResignedOrTimedOut(Color.RED)).toBe(true);
  });

  test('keeps resignation information when the wandering king is later stalemated', () => {
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
        parseSquareId(2, 9)
      ]
    ]);

    game.resignPlayer(Color.RED);

    expect(game.advanceTurn()).toBe(true);

    expect(game.isPlayerResignedOrTimedOut(Color.RED)).toBe(true);
    expect(game.isPlayerStalled(Color.RED)).toBe(true);
    expect(game.getPlayer(Color.RED).getScore()).toBe(0);
    expect(game.getPlayer(Color.BLUE).getScore()).toBe(10);
    expect(game.getPlayer(Color.YELLOW).getScore()).toBe(10);
    expect(game.getPlayer(Color.GREEN).getScore()).toBe(10);
  });
});