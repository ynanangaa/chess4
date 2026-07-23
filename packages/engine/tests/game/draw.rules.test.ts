import { describe, expect, test } from '@jest/globals';

import {
  Color,
  DefaultRuleSet,
  Game,
  GameStatus,
  MoveGenerator,
  parseSquareId,
  PieceType
} from '../../src';
import { buildDuplicatePiece, buildKing, buildQueen } from "../../src/utils/utils";
import { createClassicGame, findMoveTo } from '../test-utils';

// "Stateless" RuleSet instance used to call the draw predicates directly
// (isDrawByInsufficientMaterial / isDrawBy50MovesRule), without having to
// replay a full game.
function freshRuleSet(): DefaultRuleSet {
  return new DefaultRuleSet(new MoveGenerator());
}

// Plays a legal move and verifies that it was applied successfully.
function playMove(game: Game, pieceId: string, to: number): void {
  const move = findMoveTo(game, pieceId, to);

  expect(move).toBeDefined();
  expect(game.advanceTurn(move!)).toBe(true);
}

describe('Draw rules', () => {
  describe('Insufficient material', () => {
    test('four lone kings is a draw', () => {
      const redKing = buildKing(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(true);
    });

    test('a single minor piece on each side is still a draw', () => {
      const redKing = buildKing(Color.RED);
      const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
      const blueKing = buildKing(Color.BLUE);
      const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, redBishop, blueKing, blueKnight, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(1, 9),
          parseSquareId(7, 1),
          parseSquareId(6, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(true);
    });

    test('a single remaining queen rules out the draw', () => {
      const redKing = buildKing(Color.RED);
      const redQueen = buildQueen(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, redQueen, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(1, 7),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(false);
    });

    test('a single remaining rook rules out the draw', () => {
      const redKing = buildKing(Color.RED);
      const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, redRook, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(1, 11),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(false);
    });

    test('a bishop pair is sufficient mating material', () => {
      const redKing = buildKing(Color.RED);
      const redBishopKingside = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
      const redBishopQueenside = buildDuplicatePiece(Color.RED, PieceType.BISHOP, false);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, redBishopKingside, redBishopQueenside, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(1, 9),
          parseSquareId(1, 6),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(false);
    });

    test('a bishop and a knight together are sufficient mating material', () => {
      const redKing = buildKing(Color.RED);
      const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
      const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, false);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      const game = createClassicGame([
        [redKing, redBishop, redKnight, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(1, 9),
          parseSquareId(1, 6),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(false);
    });

    test('king + two knights is still a draw when no king can break out of its corner', () => {
      // Each king is boxed into a corner of its arm of the board by its own
      // two knights, leaving it only a single legal move.
      // No side can cooperate toward a mate: the position must remain a draw
      // even though one side holds the knight pair.
      const redKing = buildKing(Color.RED);
      const redKnightA = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
      const redKnightB = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, false);
      const blueKing = buildKing(Color.BLUE);
      const blueKnightA = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);
      const blueKnightB = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, false);
      const yellowKing = buildKing(Color.YELLOW);
      const yellowKnightA = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, true);
      const yellowKnightB = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, false);
      const greenKing = buildKing(Color.GREEN);
      const greenKnightA = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);
      const greenKnightB = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, false);

      const game = createClassicGame([
        [
          redKing, redKnightA, redKnightB,
          blueKing, blueKnightA, blueKnightB,
          yellowKing, yellowKnightA, yellowKnightB,
          greenKing, greenKnightA, greenKnightB
        ],
        [
          parseSquareId(1, 4), parseSquareId(1, 5), parseSquareId(2, 4),
          parseSquareId(4, 1), parseSquareId(4, 2), parseSquareId(5, 1),
          parseSquareId(14, 4), parseSquareId(14, 5), parseSquareId(13, 4),
          parseSquareId(4, 14), parseSquareId(4, 13), parseSquareId(5, 14)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(true);
    });

    test('king + two knights stops being a draw once one king keeps real mobility', () => {
      // Same position, but GREEN only has a single knight: its king retains
      // two free squares. A helpmate becomes theoretically possible again,
      // so the position must no longer be considered a draw.
      const redKing = buildKing(Color.RED);
      const redKnightA = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);
      const redKnightB = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, false);
      const blueKing = buildKing(Color.BLUE);
      const blueKnightA = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);
      const blueKnightB = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, false);
      const yellowKing = buildKing(Color.YELLOW);
      const yellowKnightA = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, true);
      const yellowKnightB = buildDuplicatePiece(Color.YELLOW, PieceType.KNIGHT, false);
      const greenKing = buildKing(Color.GREEN);
      const greenKnight = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);

      const game = createClassicGame([
        [
          redKing, redKnightA, redKnightB,
          blueKing, blueKnightA, blueKnightB,
          yellowKing, yellowKnightA, yellowKnightB,
          greenKing, greenKnight
        ],
        [
          parseSquareId(1, 4), parseSquareId(1, 5), parseSquareId(2, 4),
          parseSquareId(4, 1), parseSquareId(4, 2), parseSquareId(5, 1),
          parseSquareId(14, 4), parseSquareId(14, 5), parseSquareId(13, 4),
          parseSquareId(4, 14), parseSquareId(4, 13)
        ]
      ]);

      expect(freshRuleSet().isDrawByInsufficientMaterial(game)).toBe(false);
    });
  });

  describe('50-move rule', () => {
    function createLoneKingsGame(): Game {
      const redKing = buildKing(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);

      return createClassicGame([
        [redKing, blueKing, yellowKing, greenKing],
        [
          parseSquareId(1, 8),
          parseSquareId(7, 1),
          parseSquareId(14, 7),
          parseSquareId(8, 14)
        ]
      ]);
    }

    test('does not trigger before the move clock reaches 200 half-moves', () => {
      const game = createLoneKingsGame();

      for (let i = 0; i < 199; i += 1) {
        game.incrementMoveClock();
      }

      expect(freshRuleSet().isDrawBy50MovesRule(game)).toBe(false);
    });

    test('triggers once the move clock reaches 200 half-moves', () => {
      const game = createLoneKingsGame();

      for (let i = 0; i < 200; i += 1) {
        game.incrementMoveClock();
      }

      expect(freshRuleSet().isDrawBy50MovesRule(game)).toBe(true);
    });

    test('ends the game as a draw and awards 10 points to every active player once the threshold is reached', () => {
      const redKing = buildKing(Color.RED);
      const redQueen = buildQueen(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const blueQueen = buildQueen(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const yellowQueen = buildQueen(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);
      const greenQueen = buildQueen(Color.GREEN);

      // Each side keeps its queen: material remains clearly sufficient to
      // mate, so that only the 50-move rule is responsible for the draw
      // observed here.
      const game = createClassicGame([
        [redKing, redQueen, blueKing, blueQueen, yellowKing, yellowQueen, greenKing, greenQueen],
        [
          parseSquareId(1, 8), parseSquareId(1, 5),
          parseSquareId(7, 1), parseSquareId(5, 1),
          parseSquareId(14, 7), parseSquareId(14, 10),
          parseSquareId(8, 14), parseSquareId(5, 14)
        ]
      ]);

      for (let i = 0; i < 199; i += 1) {
        game.incrementMoveClock();
      }

      expect(game.isOver()).toBe(false);

      // A simple queen move, with no capture or pawn move, pushes the
      // counter to 200 and should end the game.
      playMove(game, redQueen.id, parseSquareId(2, 5));

      expect(game.isOver()).toBe(true);
      expect(game.getGameState().getStatus()).toBe(GameStatus.OVER);
      expect(game.getPlayer(Color.RED).getScore()).toBe(10);
      expect(game.getPlayer(Color.BLUE).getScore()).toBe(10);
      expect(game.getPlayer(Color.YELLOW).getScore()).toBe(10);
      expect(game.getPlayer(Color.GREEN).getScore()).toBe(10);
    });
  });

  describe('Triple repetition', () => {
    test('is declared once the same position, with the same player to move, has occurred three times', () => {
      const redKing = buildKing(Color.RED);
      const redQueen = buildQueen(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const blueQueen = buildQueen(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const yellowQueen = buildQueen(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);
      const greenQueen = buildQueen(Color.GREEN);

      // Each side keeps its queen: material remains clearly sufficient to
      // mate on either side, in order to isolate the threefold repetition
      // rule from the other draw rules (insufficient material, 50-move rule).
      const game = createClassicGame([
        [redKing, redQueen, blueKing, blueQueen, yellowKing, yellowQueen, greenKing, greenQueen],
        [
          parseSquareId(1, 8), parseSquareId(1, 5),
          parseSquareId(7, 1), parseSquareId(5, 1),
          parseSquareId(14, 7), parseSquareId(14, 10),
          parseSquareId(8, 14), parseSquareId(5, 14)
        ]
      ]);

      // Each queen performs a one-square round trip, never capturing or
      // checking a king: one full cycle (there and back, in the order RED,
      // BLUE, YELLOW, GREEN) brings the position back to exactly the
      // starting position, with RED to move again.
      const forward: [string, number][] = [
        [redQueen.id, parseSquareId(2, 5)],
        [blueQueen.id, parseSquareId(5, 2)],
        [yellowQueen.id, parseSquareId(13, 10)],
        [greenQueen.id, parseSquareId(6, 14)]
      ];
      const backward: [string, number][] = [
        [redQueen.id, parseSquareId(1, 5)],
        [blueQueen.id, parseSquareId(5, 1)],
        [yellowQueen.id, parseSquareId(14, 10)],
        [greenQueen.id, parseSquareId(5, 14)]
      ];

      const playCycle = (): void => {
        for (const [pieceId, to] of forward) playMove(game, pieceId, to);
        for (const [pieceId, to] of backward) playMove(game, pieceId, to);
      };

      // 1st return to the starting position: occurrence #2 overall, but the
      // game must not be a draw yet.
      playCycle();
      expect(game.isOver()).toBe(false);

      // 2nd return to the starting position: still not a draw.
      playCycle();
      expect(game.isOver()).toBe(false);

      // 3rd return to the starting position: the position (board + side to
      // move) has now repeated three times, the draw must be declared and
      // every active side receives the 10 draw points.
      playCycle();
      expect(game.isOver()).toBe(true);
      expect(game.getGameState().getStatus()).toBe(GameStatus.OVER);
      expect(game.getPlayer(Color.RED).getScore()).toBe(10);
      expect(game.getPlayer(Color.BLUE).getScore()).toBe(10);
      expect(game.getPlayer(Color.YELLOW).getScore()).toBe(10);
      expect(game.getPlayer(Color.GREEN).getScore()).toBe(10);
    });

    test('is not triggered by a mere repeated square when the side to move differs', () => {
      // RED and YELLOW play the same queen square one after another, but it's
      // never quite the same overall position (the other pieces haven't
      // returned to the same spot): this alone should never trigger the
      // threefold repetition rule.
      const redKing = buildKing(Color.RED);
      const redQueen = buildQueen(Color.RED);
      const blueKing = buildKing(Color.BLUE);
      const blueQueen = buildQueen(Color.BLUE);
      const yellowKing = buildKing(Color.YELLOW);
      const yellowQueen = buildQueen(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);
      const greenQueen = buildQueen(Color.GREEN);

      const game = createClassicGame([
        [redKing, redQueen, blueKing, blueQueen, yellowKing, yellowQueen, greenKing, greenQueen],
        [
          parseSquareId(1, 8), parseSquareId(1, 5),
          parseSquareId(7, 1), parseSquareId(5, 1),
          parseSquareId(14, 7), parseSquareId(14, 10),
          parseSquareId(8, 14), parseSquareId(5, 14)
        ]
      ]);

      const forward: [string, number][] = [
        [redQueen.id, parseSquareId(2, 5)],
        [blueQueen.id, parseSquareId(5, 2)],
        [yellowQueen.id, parseSquareId(13, 10)],
        [greenQueen.id, parseSquareId(6, 14)]
      ];
      const backward: [string, number][] = [
        [redQueen.id, parseSquareId(1, 5)],
        [blueQueen.id, parseSquareId(5, 1)],
        [yellowQueen.id, parseSquareId(14, 10)],
        [greenQueen.id, parseSquareId(5, 14)]
      ];

      for (const [pieceId, to] of forward) playMove(game, pieceId, to);
      for (const [pieceId, to] of backward) playMove(game, pieceId, to);

      expect(game.isOver()).toBe(false);
    });
  });
});