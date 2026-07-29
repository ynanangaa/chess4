import { describe, expect, test } from '@jest/globals';

import {
  Color,
  parseSquareId,
  PieceType,
} from '../../src';
import { buildDuplicatePiece, buildKing, buildQueen } from "../../src/utils/utils";
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
    expect(history[0].check).toContain(Color.BLUE);
    expect(history[0].check).not.toContain(Color.YELLOW);
    expect(history[0].check).toContain(Color.GREEN);
  });

  test('detects a discovered check delivered by the mover\'s own piece', () => {
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
    expect(game.isPlayerInCheck(Color.RED)).toBe(true);

    const history = game.getHistory();
    const lastMove = history[history.length - 1];

    expect(lastMove.check).toContain(Color.RED);
  });

  test('attributes a check discovered across colors to the piece that moved, not the attacker', () => {
    // GREEN's queen and RED's king share row 7, with BLUE's knight sitting
    // directly between them on that same row, blocking the line. Moving
    // the knight away (to a square that itself attacks no king) uncovers
    // GREEN's queen's attack on RED's king. The move that caused this is
    // BLUE's — it must be the one annotated with the new check, even
    // though the attacking piece belongs to GREEN.
    const redKing = buildKing(Color.RED);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);
    const greenQueen = buildQueen(Color.GREEN);

    const game = createClassicGame([
      [redKing, blueKing, yellowKing, greenKing, blueKnight, greenQueen],
      [
        parseSquareId(7, 2),   // RED king
        parseSquareId(10, 1),  // BLUE king
        parseSquareId(14, 8),  // YELLOW king
        parseSquareId(9, 13),  // GREEN king
        parseSquareId(7, 6),   // BLUE knight — blocks row 7
        parseSquareId(7, 10)   // GREEN queen — same row as RED king
      ]
    ]);

    advanceToPlayer(game, Color.BLUE);

    const knightMove = findMoveTo(game, blueKnight.id, parseSquareId(5, 5));
    expect(knightMove).toBeDefined();
    expect(game.advanceTurn(knightMove!)).toBe(true);

    expect(game.isPlayerInCheck(Color.RED)).toBe(true);

    const history = game.getHistory();
    const lastMove = history[history.length - 1];

    // The recorded move is BLUE's knight move, not GREEN's queen.
    expect(lastMove.pieceId).toBe(blueKnight.id);
    expect(lastMove.check).toHaveLength(1);
    expect(lastMove.check).toContain(Color.RED);
  });
});