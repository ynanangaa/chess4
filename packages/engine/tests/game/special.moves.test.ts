import { describe, expect, test } from '@jest/globals';

import {
  Color,
  parseSquareId,
  PieceType
} from '../../src';
import { 
  buildDuplicatePiece, 
  buildKing, 
  buildPawn,
  buildQueen 
} from "../../src/utils/utils";
import { createClassicGame } from '../test-utils';

describe('Game special moves', () => {
  test.each([Color.RED, Color.BLUE])(
    'exposes pawn double-step moves from the initial rank for %s',
    color => {
      const pawn = buildPawn(color, 4);
      const startSquare = color === Color.RED ? parseSquareId(2, 7) : parseSquareId(8, 2);
      const oneStepSquare = color === Color.RED ? parseSquareId(3, 7) : parseSquareId(8, 3);
      const twoStepSquare = color === Color.RED ? parseSquareId(4, 7) : parseSquareId(8, 4);
      const game = createClassicGame([[pawn], [startSquare]]);

      const destinations = game.getLegalMoves(pawn.id).map(move => move.to);

      expect(destinations).toContain(oneStepSquare);
      expect(destinations).toContain(twoStepSquare);
    }
  );

  test.each([Color.RED, Color.BLUE])(
    'applies castling moves by moving the rook into place for %s',
    color => {
      const king = buildKing(color);
      const rook = buildDuplicatePiece(color, PieceType.ROOK, true);
      const kingStart = color === Color.RED ? parseSquareId(1, 8) : parseSquareId(7, 1);
      const rookStart = color === Color.RED ? parseSquareId(1, 11) : parseSquareId(4, 1);
      const castleTarget = color === Color.RED ? parseSquareId(1, 10) : parseSquareId(5, 1);
      const rookTarget = color === Color.RED ? parseSquareId(1, 9) : parseSquareId(6, 1);

      const game = createClassicGame([[king, rook], [kingStart, rookStart]]);

      const castleMove = game.getLegalMoves(king.id).find(move => move.castle === 'kingside');

      expect(castleMove).toBeDefined();
      expect(game.applyMove(castleMove!)).toBe(true);
      expect(game.getBoard().getSquareOf(king.id)).toBe(castleTarget);
      expect(game.getBoard().getSquareOf(rook.id)).toBe(rookTarget);
    }
  );

  test('forbids castling through an attacked square', () => {
    const redKing = buildKing(Color.RED);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);
    const greenQueen = buildQueen(Color.GREEN);

    const game = createClassicGame([
      [redKing, redRook, blueKing, yellowKing, greenKing, greenQueen],
      [
        parseSquareId(1, 8),
        parseSquareId(1, 11),
        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),
        parseSquareId(5, 9)
      ]
    ]);

    const kingMoves = game.getLegalMoves(redKing.id);

    expect(kingMoves.some(move => move.castle === 'kingside')).toBe(false);
  });

  test.each([Color.RED, Color.BLUE])(
    'exposes pawn promotion move for %s',
    color => {
      const pawn = buildPawn(color, 4);
      const startSquare = color === Color.RED ? parseSquareId(7, 7) : parseSquareId(10, 7);
      const promotionSquare = color === Color.RED ? parseSquareId(8, 7) : parseSquareId(10, 8);
      const game = createClassicGame([[pawn], [startSquare]]);

      const promotionMove = game
        .getLegalMoves(pawn.id)
        .find(move => move.pawnSpecialMove === 'promotion');

      expect(promotionMove).toBeDefined();
      expect(game.applyMove(promotionMove!)).toBe(true);
      expect(game.getBoard().getSquareOf(pawn.id)).toBe(promotionSquare);
      expect(game.getBoard().getPiece(pawn.id)?.type).toBe(PieceType.QUEEN);
    }
  );
});
