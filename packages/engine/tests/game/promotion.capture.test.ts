import { describe, expect, it } from '@jest/globals';
import { Color, DefaultRuleSet, Game, MoveGenerator, PieceType } from '../../src';
import { kingInitialSquareId } from '../../src/utils/utils';

it('sets `capture` on a pawn move that both captures and promotes', () => {
  const ruleSet = new DefaultRuleSet(new MoveGenerator());

  const pawn = { id: 'blue-1', type: PieceType.PAWN, color: Color.BLUE, points: 1 };
  const victim = { id: 'B-yellow-kingside', type: PieceType.BISHOP, color: Color.YELLOW, points: 5 };
  const kingBlue = { id: 'K-blue', type: PieceType.KING, color: Color.BLUE };
  const kingYellow = { id: 'K-yellow', type: PieceType.KING, color: Color.YELLOW };

  // Blue promotes along column 7 (see kingInitialSquareId/queenInitialSquareId
  // conventions); pawn one diagonal step away from a victim sitting on
  // blue's promotion square.
  const fromSquareId = 14 * (7 - 1) + (12 - 1); // row 12, col 7
  const toSquareId = 14 * (8 - 1) + (11 - 1);   // row 11, col 8 (blue's promotion file)

  const pieces = [pawn, victim, kingBlue, kingYellow];
  const squareIds = [
    fromSquareId,
    toSquareId,
    kingInitialSquareId(Color.BLUE),
    kingInitialSquareId(Color.YELLOW),
  ];

  const game = new Game(ruleSet, [pieces, squareIds]);

  const legalMoves = ruleSet.getLegalMoves(pawn.id, game);
  const captureMove = legalMoves.find(m => m.to === toSquareId);

  expect(captureMove).toBeDefined();
  expect(captureMove?.pawnSpecialMove).toBe('promotion');
  expect(captureMove?.capture).toBe('B-yellow-kingside');
});