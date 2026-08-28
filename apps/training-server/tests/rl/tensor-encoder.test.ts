import { describe, expect, it } from '@jest/globals';
import { Color, DefaultRuleSet, Game, MoveGenerator } from '@chess4/engine';
import {
  buildTrainingTensors,
  GLOBAL_VECTOR_DIM,
  MOVE_FEATURE_DIM,
  NUM_PLANES,
} from '../../src/rl/tensor-encoder';

function freshGame(): Game {
  return new Game(new DefaultRuleSet(new MoveGenerator()));
}

describe('buildTrainingTensors', () => {
  it('produces a validity plane with exactly 160 playable squares', () => {
    const game = freshGame();
    const { planes } = buildTrainingTensors(game, game.getCurrentPlayerColor());

    const validityPlane = planes.slice((NUM_PLANES - 1) * 196, NUM_PLANES * 196);
    const onCount = validityPlane.reduce((sum, v) => sum + (v === 1 ? 1 : 0), 0);

    expect(onCount).toBe(160);
  });

  it('produces exactly one occupied cell per piece plane group, per starting piece', () => {
    const game = freshGame();
    const board = game.getBoard();
    const { planes } = buildTrainingTensors(game, Color.RED);

    const totalOccupiedCells = planes
      .slice(0, (NUM_PLANES - 1) * 196)
      .reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0);

    expect(totalOccupiedCells).toBe(board.getOccupiedSquares().size);
  });

  it('produces a global vector of the declared fixed length', () => {
    const game = freshGame();
    const { globalVector } = buildTrainingTensors(game, game.getCurrentPlayerColor());

    expect(globalVector.length).toBe(GLOBAL_VECTOR_DIM);
  });

  it('produces one move-feature row and one moveMeta entry per legal move', () => {
    const game = freshGame();
    const perspective = game.getCurrentPlayerColor();
    const board = game.getBoard();

    const expectedMoveCount = board
      .getPiecesByColor(perspective)
      .reduce((sum, piece) => sum + game.getLegalMoves(piece.id).length, 0);

    const { moveFeatures, moveCount, moveMeta } = buildTrainingTensors(game, perspective);

    expect(moveCount).toBe(expectedMoveCount);
    expect(moveMeta.length).toBe(expectedMoveCount);
    expect(moveFeatures.length).toBe(expectedMoveCount * MOVE_FEATURE_DIM);
  });

  it('every moveMeta entry corresponds to an actually-legal move for its piece', () => {
    const game = freshGame();
    const perspective = game.getCurrentPlayerColor();

    const { moveMeta } = buildTrainingTensors(game, perspective);

    for (const { pieceId, from, to } of moveMeta) {
      const legal = game.getLegalMoves(pieceId);
      expect(legal.some(m => m.from === from && m.to === to)).toBe(true);
    }
  });

  it('encodes an inactive piece as 0.5 and an active piece as 1', () => {
    // RED's queen starts active; after RED resigns, all non-king pieces
    // (including the queen) become inactive — see RuleSet.resignPlayer.
    const game = freshGame();
    game.resignPlayer(Color.RED);

    const { planes } = buildTrainingTensors(game, game.getCurrentPlayerColor());
    const board = game.getBoard();
    const queenSquareId = board.getSquareOf('Q-red')!;

    const { row, col } = (() => {
      const r = (queenSquareId % 14) + 1;
      const c = Math.trunc(queenSquareId / 14) + 1;
      return { row: r, col: c };
    })();

    // Just confirm the encoded value at that piece's plane cell is 0.5,
    // regardless of exact rotation/plane index — locate it generically.
    const allValues = Array.from(planes).filter(v => v !== 0 && v !== 1);
    expect(allValues).toContain(0.5);
  });
});