import { describe, expect, test } from '@jest/globals';

import { ClassicRuleSet, Color, Game, GameStatus, 
  MoveGenerator, PieceType, PlayerState, 
  buildDuplicatePiece, buildKing, buildPawn, 
  buildQueen, 
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

  test('filters legal moves when checked by a rook', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, false);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        redBishop,
        redRook,
        blueKing,
        yellowKing,
        greenKing,
        greenRook
      ], [
        parseSquareId(1, 8),   // red king
        parseSquareId(3, 7),   // red bishop
        parseSquareId(1, 4),

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(8, 14),

        parseSquareId(7, 11)   // checking rook
      ]]
    );

    // Simulate that the rook has just checked the red king
    const greenRookMove = customGame
      .getLegalMoves(greenRook.id)
      .find(m => m.to === parseSquareId(1, 11)
    );
    expect(greenRookMove).toBeDefined();

    customGame.applyMove(greenRookMove!);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    const bishopMoves = customGame.getLegalMoves(redBishop.id);

    // Interposition allowed
    expect(bishopMoves).toContainEqual(
      expect.objectContaining({ to: parseSquareId(1, 9) })
    );

    // Unrelated move must be filtered out
    expect(bishopMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 8) })
    );

    const kingMoves = customGame.getLegalMoves(redKing.id);

    // No castle while in check
    expect(
      kingMoves.some(
        m => m.castle === "queenside"
      )
    ).toBe(false);
  });

  test('filters legal moves when checked by a knight', () => {
    const redKing = buildKing(Color.RED);
    const redBishop = buildDuplicatePiece(Color.RED, PieceType.BISHOP, true);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
    const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenKnight = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        redBishop,
        redRook,
        redKnight,
        blueKing,
        yellowKing,
        greenKing,
        greenKnight
      ], [
        parseSquareId(1, 7),   // red king
        parseSquareId(3, 5),   // red bishop
        parseSquareId(1, 11),
        parseSquareId(1, 9),   // red knight

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),

        parseSquareId(4, 10)    // checking knight
      ]]
    );

    const greenKnightMove = customGame
      .getLegalMoves(greenKnight.id)
      .find(m => m.to === parseSquareId(3, 8)
    )
    expect(greenKnightMove).toBeDefined();

    customGame.applyMove(greenKnightMove!);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    const bishopMoves = customGame.getLegalMoves(redBishop.id);

    // A bishop cannot interpose against a knight check
    expect(bishopMoves).toEqual([]);

    const knightMoves = customGame.getLegalMoves(redKnight.id);

    // Capturing the checking knight is allowed
    expect(knightMoves).toContainEqual(
      expect.objectContaining({ to: parseSquareId(3, 8) })
    );

    const kingMoves = customGame.getLegalMoves(redKing.id);

    expect(kingMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 6) })
    );

    // No castle while in check
    expect(
      kingMoves.some(
        m => m.castle === "kingside"))
      .toBe(false);
  });

  test('forbids castling through an attacked square', () => {
    const redKing = buildKing(Color.RED);
    const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenQueen = buildQueen(Color.GREEN);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        redRook,
        blueKing,
        yellowKing,
        greenKing,
        greenQueen
      ], [
        parseSquareId(1, 8),   // red king
        parseSquareId(1, 11),  // kingside rook

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),

        parseSquareId(5, 9)    // attacks the square the king would cross
      ]]
    );

    const kingMoves = customGame.getLegalMoves(redKing.id);

    expect(
      kingMoves.some(m => m.castle === 'kingside')
    ).toBe(false);
  });

  test('allows only king moves during double check', () => {
    const redKing = buildKing(Color.RED);
    const redKnight = buildDuplicatePiece(Color.RED, PieceType.KNIGHT, true);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const greenBishop = buildDuplicatePiece(Color.GREEN, PieceType.BISHOP, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        redKnight,
        blueKing,
        yellowKing,
        greenKing,
        greenRook,
        greenBishop
      ], [
        parseSquareId(1, 7),   // red king
        parseSquareId(3, 11),   // red knight

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),

        parseSquareId(1, 11),  // rook
        parseSquareId(5, 11)   // bishop
      ]]
    );

    // Le fou se déplace pour créer le double check
    const bishopMove = customGame
      .getLegalMoves(greenBishop.id)
      .find(m => m.to === parseSquareId(3, 9));

    expect(bishopMove).toBeDefined();

    expect(customGame.applyMove(bishopMove!)).toBe(true);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    // Une pièce non-roi ne peut pas jouer
    expect(customGame.getLegalMoves(redKnight.id)).toEqual([]);

    // Le roi conserve des coups de fuite
    expect(customGame.getLegalMoves(redKing.id).length)
      .toBeGreaterThan(0);
  });

  test('filters king moves after a check', () => {
    const redKing = buildKing(Color.RED);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        blueKing,
        yellowKing,
        greenKing,
        greenRook
      ], [
        parseSquareId(2, 7),   // red king

        parseSquareId(10, 1),
        parseSquareId(13, 9),
        parseSquareId(7, 14),

        parseSquareId(1, 11)   // rook
      ]]
    );

    // La tour donne échec
    const rookMove = customGame
      .getLegalMoves(greenRook.id)
      .find(m => m.to === parseSquareId(1, 9));

    expect(rookMove).toBeDefined();

    expect(customGame.applyMove(rookMove!)).toBe(true);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    const kingMoves = customGame.getLegalMoves(yellowKing.id);

    // Le roi ne peut pas avancer dans la ligne d'attaque
    expect(kingMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(14, 9) })
    );

    expect(kingMoves).toContainEqual(
      expect.objectContaining({ to: parseSquareId(13, 8) })
    );

    // Il doit avoir au moins une case de fuite
    expect(kingMoves.length).toBeGreaterThan(0);
    expect(kingMoves.length).toBeLessThan(8);
  });

  test('detects a discovered check after a blocking piece moves', () => {
    const redKing = buildKing(Color.RED);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const greenKnight = buildDuplicatePiece(Color.GREEN, PieceType.KNIGHT, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        blueKing,
        yellowKing,
        greenKing,
        greenRook,
        greenKnight
      ], [
        parseSquareId(1, 7),   // red king

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),

        parseSquareId(1, 11),  // rook
        parseSquareId(1, 9)    // knight blocking the rook
      ]]
    );

    const knightMove = customGame
      .getLegalMoves(greenKnight.id)
      .find(m => m.to === parseSquareId(3, 10));

    expect(knightMove).toBeDefined();

    expect(customGame.applyMove(knightMove!)).toBe(true);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    const history = customGame.getHistory();
    const lastMove = history[history.length - 1];

    expect(lastMove.check).toBeDefined();
    expect(lastMove.check!.has(greenRook.id)).toBe(true);
  });

  test('prevents the king from capturing a protected adjacent attacker', () => {
    const redKing = buildKing(Color.RED);

    const blueKing = buildKing(Color.BLUE);
    const yellowKing = buildKing(Color.YELLOW);
    const greenKing = buildKing(Color.GREEN);

    const greenRook = buildDuplicatePiece(Color.GREEN, PieceType.ROOK, true);
    const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);

    const customGame = new Game(
      new ClassicRuleSet(new MoveGenerator()),
      [[
        redKing,
        blueKing,
        yellowKing,
        greenKing,
        greenRook,
        blueKnight
      ], [
        parseSquareId(1, 7),   // red king

        parseSquareId(10, 1),
        parseSquareId(14, 8),
        parseSquareId(7, 14),

        parseSquareId(3, 7),   // rook
        parseSquareId(4, 8)    // knight protecting g2
      ]]
    );

    const rookMove = customGame
      .getLegalMoves(greenRook.id)
      .find(m => m.to === parseSquareId(2, 7));

    expect(rookMove).toBeDefined();

    expect(customGame.applyMove(rookMove!)).toBe(true);

    expect(customGame.getGameState().getPlayerState(Color.RED))
      .toBe(PlayerState.CHECK);

    const kingMoves = customGame.getLegalMoves(redKing.id);

    // The rook on g2 is protected by the bishop, so the king cannot capture it
    expect(kingMoves).not.toContainEqual(
      expect.objectContaining({ to: parseSquareId(2, 7) })
    );
  });

});
