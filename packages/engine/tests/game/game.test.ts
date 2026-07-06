import { describe, expect, test } from '@jest/globals';

import { ClassicRuleSet, Color, Game, GameStatus, 
  MoveGenerator, PieceType, PlayerState, 
  buildDuplicatePiece, buildKing, buildPawn, 
  parseSquareId 
} from '../../src';

describe('Game', () => {

  test.each([Color.RED, Color.BLUE])('exposes pawn double-step moves from the initial rank for %s', (color) => {
    const pawn = buildPawn(color, 4);
    const startSquare = color === Color.RED ? parseSquareId(2, 7) : parseSquareId(8, 2);
    const oneStepSquare = color === Color.RED ? parseSquareId(3, 7) : parseSquareId(8, 3);
    const twoStepSquare = color === Color.RED ? parseSquareId(4, 7) : parseSquareId(8, 4);
    const customGame = new Game(new ClassicRuleSet(new MoveGenerator()), [[pawn], [startSquare]]);

    const moves = customGame.getLegalMoves(pawn.id);
    const destinations = moves.map(move => move.to);

    expect(destinations).toContain(oneStepSquare);
    expect(destinations).toContain(twoStepSquare);
  });

  test.each([Color.RED, Color.BLUE])('applies en-passant moves by removing the captured pawn for %s', (color) => {
    const pawn = buildPawn(color, 4);
    const enemyPawn = buildPawn(color === Color.RED ? Color.YELLOW : Color.GREEN, 4);
    const pawnStart = parseSquareId(5, 5);
    const enemyStart = color === Color.RED ? parseSquareId(5, 4) : parseSquareId(4, 5);
    const lastMoveTarget = color === Color.RED ? pawnStart + 14 : pawnStart + 1;
    const enPassantTarget = color === Color.RED ? lastMoveTarget + 1 : lastMoveTarget + 14;

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[pawn, enemyPawn], [pawnStart, enemyStart]]
    );

    customGame.applyMove({
      pieceId: enemyPawn.id,
      from: enemyStart,
      to: lastMoveTarget,
      pawnSpecialMove: 'doublestep',
    });

    const enPassantMove = customGame.getLegalMoves(pawn.id).find(move => move.to === enPassantTarget);
    expect(enPassantMove).toBeDefined();
    expect(enPassantMove?.pawnSpecialMove).toBe("e-p");

    const applied = customGame.applyMove(enPassantMove!);

    expect(applied).toBe(true);
    expect(customGame.getBoard().getPositionOf(pawn.id)).toBe(enPassantTarget);
    expect(customGame.getBoard().getPieceAt(lastMoveTarget)).toBeUndefined();
    expect(customGame.getBoard().getPieceAt(enPassantTarget)).toEqual(pawn);
  });

  test.each([Color.RED, Color.BLUE])('applies castling moves by moving the rook into place for %s', (color) => {
    const king = buildKing(color);
    const rook = buildDuplicatePiece(color, PieceType.ROOK, true);
    const kingStart = color === Color.RED ? parseSquareId(1, 8) : parseSquareId(8, 1);
    const rookStart = color === Color.RED ? parseSquareId(1, 11) : parseSquareId(11, 1);
    const castleTarget = color === Color.RED ? parseSquareId(1, 10) : parseSquareId(10, 1);
    const rookTarget = color === Color.RED ? parseSquareId(1, 9) : parseSquareId(9, 1);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[king, rook], [kingStart, rookStart]]
    );

    const castleMove = customGame.getLegalMoves(king.id).find(move => move.castle === 'kingside');
    expect(castleMove).toBeDefined();

    const applied = customGame.applyMove(castleMove!);

    expect(applied).toBe(true);
    expect(customGame.getBoard().getPositionOf(king.id)).toBe(castleTarget);
    expect(customGame.getBoard().getPositionOf(rook.id)).toBe(rookTarget);
  });

  test.each([Color.RED, Color.BLUE])('exposes pawn promotion move for %s', (color) => {
    const pawn = buildPawn(color, 4);
    const startSquare = color === Color.RED ? parseSquareId(7, 7) : parseSquareId(10, 7);
    const promotionSquare = color === Color.RED ? parseSquareId(8, 7) : parseSquareId(10, 8);
    const customGame = new Game(new ClassicRuleSet(new MoveGenerator()), [[pawn], [startSquare]]);

    const promotionMove = customGame.getLegalMoves(pawn.id).find(move => 
      move.pawnSpecialMove === 'promotion');
    expect(promotionMove).toBeDefined();

    const applied = customGame.applyMove(promotionMove!);

    expect(applied).toBe(true);
    expect(customGame.getBoard().getPositionOf(pawn.id)).toBe(promotionSquare);
    expect(customGame.getBoard().getPiece(pawn.id)?.type).toBe(PieceType.QUEEN);
  });

  test('detects all checked kings after a move', () => {
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redRook,
        blueKing,
        yellowKing,
        greenKing
      ], [
        parseSquareId(1, 4),   // red rook
        parseSquareId(10, 4),  //
        parseSquareId(11, 13),   // not attacked
        parseSquareId(7, 7)    // bishop diagonal
      ]]
    );

    const checkingMove = customGame
      .getLegalMoves(redRook.id)
      .find(move => move.to === parseSquareId(7, 4));

    expect(checkingMove).toBeDefined();

    expect(customGame.applyMove(checkingMove!)).toBe(true);

    const history = customGame.getHistory();
    expect(history).toHaveLength(1);

    expect(history[0].check).toBeInstanceOf(Map);
    expect(history[0].check?.has(redRook.id)).toBe(true);
    expect(history[0].check?.get(redRook.id)).toContain(Color.BLUE);
    expect(history[0].check?.get(redRook.id)).not.toContain(Color.YELLOW);
    expect(history[0].check?.get(redRook.id)).toContain(Color.GREEN);
  });
});
