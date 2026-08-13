import { describe, expect, test } from '@jest/globals';
import { Color, DefaultRuleSet, Game, MoveGenerator } from '@chess4/engine';
import { buildSnapshot } from '../../src/protocol/snapshot';

describe('buildSnapshot', () => {
  test('populates legalMoves only for the current player', () => {
    const engine = new DefaultRuleSet(new MoveGenerator());
    const game = new Game(engine); // Starts with RED to move

    const snapshot = buildSnapshot(game);

    expect(snapshot.currentPlayer).toBe(Color.RED);
    expect(Object.keys(snapshot.legalMoves).length).toBeGreaterThan(0);

    // Verify all returned legal moves belong strictly to RED's pieces
    for (const pieceId of Object.keys(snapshot.legalMoves)) {
      expect(pieceId.includes('red')).toBe(true);
      expect(snapshot.legalMoves[pieceId].length).toBeGreaterThan(0);
    }
  });

  test('returns empty legalMoves when the game is over', () => {
    const engine = new DefaultRuleSet(new MoveGenerator());
    const game = new Game(engine);

    // Forcibly end the game to test terminal state
    game.resignPlayer(Color.RED);
    game.resignPlayer(Color.BLUE);
    game.resignPlayer(Color.YELLOW);
    game.resignPlayer(Color.GREEN);

    expect(game.isOver()).toBe(true);

    const snapshot = buildSnapshot(game);
    expect(snapshot.legalMoves).toEqual({});
  });
});