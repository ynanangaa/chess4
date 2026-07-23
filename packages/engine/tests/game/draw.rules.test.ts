import { describe, expect, test } from '@jest/globals';

import {
  buildDuplicatePiece,
  buildKing,
  buildQueen,
  Color,
  DefaultRuleSet,
  Game,
  GameStatus,
  MoveGenerator,
  parseSquareId,
  PieceType
} from '../../src';
import { createClassicGame, findMoveTo } from '../test-utils';

// Instance de RuleSet "sans état" utilisée pour appeler directement les
// prédicats de nulle (isDrawByInsufficientMaterial / isDrawBy50MovesRule),
// sans avoir à rejouer une partie complète.
function freshRuleSet(): DefaultRuleSet {
  return new DefaultRuleSet(new MoveGenerator());
}

// Joue un coup légal et vérifie qu'il a bien été appliqué.
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
      // Chaque roi est enfermé dans un coin de son bras du plateau par ses
      // deux propres cavaliers, ne lui laissant qu'un seul coup légal.
      // Aucun camp ne peut coopérer vers un mat : la position doit rester nulle
      // même si un camp possède la paire de cavaliers.
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
      // Même position, mais GREEN ne possède qu'un seul cavalier : son roi
      // conserve deux cases libres. Un mat d'aide redevient théoriquement
      // possible, la position ne doit donc plus être considérée comme nulle.
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

      // Chaque camp garde sa dame : le matériel reste largement suffisant
      // pour mater, afin que seule la règle des 50 coups soit responsable
      // de la nulle observée ici.
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

      // Un simple coup de dame, sans capture ni coup de pion, fait passer
      // le compteur à 200 et doit clore la partie.
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

      // Chaque camp conserve sa dame : le matériel reste largement suffisant
      // pour mater de part et d'autre, afin d'isoler la règle de triple
      // répétition des autres règles de nulle (matériel insuffisant, 50 coups).
      const game = createClassicGame([
        [redKing, redQueen, blueKing, blueQueen, yellowKing, yellowQueen, greenKing, greenQueen],
        [
          parseSquareId(1, 8), parseSquareId(1, 5),
          parseSquareId(7, 1), parseSquareId(5, 1),
          parseSquareId(14, 7), parseSquareId(14, 10),
          parseSquareId(8, 14), parseSquareId(5, 14)
        ]
      ]);

      // Chaque dame effectue un aller-retour d'une case, sans jamais capturer
      // ni mettre un roi en échec : un cycle complet (aller + retour, dans
      // l'ordre RED, BLUE, YELLOW, GREEN) ramène exactement la position de
      // départ, avec RED de nouveau au trait.
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

      // 1er retour à la position de départ : occurrence n°2 dans l'absolu,
      // mais la partie ne doit pas encore être nulle.
      playCycle();
      expect(game.isOver()).toBe(false);

      // 2e retour à la position de départ : toujours pas de nulle.
      playCycle();
      expect(game.isOver()).toBe(false);

      // 3e retour à la position de départ : la position (plateau + camp au
      // trait) s'est maintenant répétée trois fois, la nulle doit être
      // déclarée et chaque camp actif reçoit les 10 points de la nulle.
      playCycle();
      expect(game.isOver()).toBe(true);
      expect(game.getGameState().getStatus()).toBe(GameStatus.OVER);
      expect(game.getPlayer(Color.RED).getScore()).toBe(10);
      expect(game.getPlayer(Color.BLUE).getScore()).toBe(10);
      expect(game.getPlayer(Color.YELLOW).getScore()).toBe(10);
      expect(game.getPlayer(Color.GREEN).getScore()).toBe(10);
    });

    test('is not triggered by a mere repeated square when the side to move differs', () => {
      // RED et YELLOW jouent la même case de dame l'un après l'autre, mais ce
      // n'est jamais tout à fait la même position globale (les autres pièces
      // ne sont pas revenues au même endroit) : cela ne doit jamais, à soi
      // seul, déclencher la règle de triple répétition.
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