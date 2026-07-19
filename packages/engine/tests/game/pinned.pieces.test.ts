import { describe, expect, test } from '@jest/globals';

import { 
    buildDuplicatePiece, 
    buildKing, 
    buildPawn, 
    Color, 
    parseSquareId, 
    PieceType 
} from '../../src';
import { createClassicGame, findMoveTo } from '../test-utils';

describe("Pinned pieces to attack's line on king", () => {
  test.each([
    {
      name: 'bishop pins rook',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.BISHOP, true),
      defenderBuilder: () => buildDuplicatePiece(Color.BLUE, PieceType.ROOK, true),
      attackerFrom: parseSquareId(2, 5),
      attackerTo: parseSquareId(4, 7),
      defenderPos: parseSquareId(9, 1),
      kingPos: parseSquareId(10, 1),
      legalMove: parseSquareId(9, 2),
      illegalMove: parseSquareId(8, 1)
    },
    {
      name: 'rook pins bishop',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.ROOK, true),
      defenderBuilder: () => buildDuplicatePiece(Color.BLUE, PieceType.BISHOP, true),
      attackerFrom: parseSquareId(1, 11),
      attackerTo: parseSquareId(8, 11),
      defenderPos: parseSquareId(7, 2),
      kingPos: parseSquareId(8, 1),
      legalMove: parseSquareId(8, 3),
      illegalMove: parseSquareId(6, 1)
    }
  ])(
    'allows a pinned sliding piece to move only along the pin line ($name)',
    ({
      attackerBuilder,
      defenderBuilder,
      attackerFrom,
      attackerTo,
      defenderPos,
      kingPos,
      legalMove,
      illegalMove
    }) => {
      const redKing = buildKing(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const attacker = attackerBuilder();
      const defender = defenderBuilder();

      const game = createClassicGame([
        [redKing, attacker, blueKing, defender, yellowKing, greenKing],
        [
          parseSquareId(1, 7),
          attackerFrom,
          kingPos,
          defenderPos,
          parseSquareId(14, 8),
          parseSquareId(8, 14)
        ]
      ]);

      const attackMove = findMoveTo(game, attacker.id, attackerTo);

      expect(attackMove).toBeDefined();
      expect(game.applyMove(attackMove!)).toBe(true);

      const moves = game.getLegalMoves(defender.id);

      expect(moves).toContainEqual(
        expect.objectContaining({ to: legalMove })
      );

      expect(moves).not.toContainEqual(
        expect.objectContaining({ to: illegalMove })
      );
    }
  );

  test.each([
    {
      name: 'bishop pins knight',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.BISHOP, true),
      attackerFrom: parseSquareId(2, 5),
      attackerTo: parseSquareId(4, 7),
      knightPos: parseSquareId(8, 3),
      kingPos: parseSquareId(10, 1)
    },
    {
      name: 'rook pins knight',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.ROOK, true),
      attackerFrom: parseSquareId(1, 11),
      attackerTo: parseSquareId(8, 11),
      knightPos: parseSquareId(8, 4),
      kingPos: parseSquareId(8, 1)
    }
  ])(
    'prevents a pinned knight from moving ($name)',
    ({
      attackerBuilder,
      attackerFrom,
      attackerTo,
      knightPos,
      kingPos
    }) => {
      const redKing = buildKing(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const attacker = attackerBuilder();
      const knight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);

      const game = createClassicGame([
        [redKing, attacker, blueKing, knight, yellowKing, greenKing],
        [
          parseSquareId(1, 7),
          attackerFrom,
          kingPos,
          knightPos,
          parseSquareId(14, 8),
          parseSquareId(8, 14)
        ]
      ]);

      const attackMove = findMoveTo(game, attacker.id, attackerTo);

      expect(attackMove).toBeDefined();
      expect(game.applyMove(attackMove!)).toBe(true);

      expect(game.getLegalMoves(knight.id)).toHaveLength(0);
    }
  );

  test('does not restrict the king or unrelated friendly pieces', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);

    const blueKing = buildKing(Color.BLUE);
    const blueRook = buildDuplicatePiece(Color.BLUE, PieceType.ROOK, true);
    const bluePawn = buildPawn(Color.BLUE, 6);

    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const game = createClassicGame([
      [
        redKing,
        redBishop,
        blueKing,
        blueRook,
        bluePawn,
        yellowKing,
        greenKing
      ],
      [
        parseSquareId(1, 7),
        parseSquareId(2, 5),
        parseSquareId(10, 1),
        parseSquareId(9, 2),
        parseSquareId(6, 3),
        parseSquareId(14, 8),
        parseSquareId(8, 14)
      ]
    ]);

    const bishopMove = findMoveTo(
      game,
      redBishop.id,
      parseSquareId(4, 7)
    );

    expect(bishopMove).toBeDefined();
    expect(game.applyMove(bishopMove!)).toBe(true);

    expect(game.getLegalMoves(bluePawn.id)).toContainEqual(
      expect.objectContaining({
        to: parseSquareId(6, 4)
      })
    );

    expect(game.getLegalMoves(blueKing.id).length).toBeGreaterThan(0);
  });

  test.each([
    {
      name: 'bishop pins bishop',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.BISHOP, true),
      defenderBuilder: () => buildDuplicatePiece(Color.BLUE, PieceType.BISHOP, true),
      attackerFrom: parseSquareId(1, 6),
      attackerTo: parseSquareId(2, 5),
      defenderPos: parseSquareId(5, 8),
      kingPos: parseSquareId(6, 9)
    },
    {
      name: 'rook pins rook',
      attackerBuilder: () => buildDuplicatePiece(Color.RED, PieceType.ROOK, true),
      defenderBuilder: () => buildDuplicatePiece(Color.BLUE, PieceType.ROOK, true),
      attackerFrom: parseSquareId(1, 11),
      attackerTo: parseSquareId(8, 11),
      defenderPos: parseSquareId(8, 10),
      kingPos: parseSquareId(8, 8)
    }
  ])(
    'allows a pinned piece to capture the attacker ($name)',
    ({
      attackerBuilder,
      defenderBuilder,
      attackerFrom,
      attackerTo,
      defenderPos,
      kingPos
    }) => {
      const redKing = buildKing(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const attacker = attackerBuilder();
      const defender = defenderBuilder();

      const game = createClassicGame([
        [redKing, attacker, blueKing, defender, yellowKing, greenKing],
        [
          parseSquareId(1, 7),
          attackerFrom,
          kingPos,
          defenderPos,
          parseSquareId(14, 9),
          parseSquareId(7, 14)
        ]
      ]);

      const attackMove = findMoveTo(game, attacker.id, attackerTo);

      expect(attackMove).toBeDefined();
      expect(game.applyMove(attackMove!)).toBe(true);

      expect(game.getLegalMoves(defender.id)).toContainEqual(
        expect.objectContaining({
          to: attackerTo
        })
      );
    }
  );
});