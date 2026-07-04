import { describe, expect, test, beforeEach } from '@jest/globals';

import { Board, Color, initializePieces, parseSquareId } from '../../src';

let board: Board;
let redPieces: any[];
let redPositions: number[];
let bluePieces: any[];
let bluePositions: number[];
let yellowPieces: any[];
let yellowPositions: number[];
let greenPieces: any[];
let greenPositions: number[];

describe('Board', () => {
  beforeEach(() => {
    board = new Board();
    [redPieces, redPositions] = initializePieces(Color.RED);
    [bluePieces, bluePositions] = initializePieces(Color.BLUE);
    [yellowPieces, yellowPositions] = initializePieces(Color.YELLOW);
    [greenPieces, greenPositions] = initializePieces(Color.GREEN);
  });

  test('constructs a full starting board with valid occupied squares for one piece of each color', () => {
    expect(board.getOccupiedSquares().size).toBe(64);

    const redPiece = redPieces[0];
    const bluePiece = bluePieces[0];
    const yellowPiece = yellowPieces[0];
    const greenPiece = greenPieces[0];

    expect(board.getPiece(redPiece.id)).toEqual(redPiece);
    expect(board.getPositionOf(redPiece.id)).toBe(redPositions[0]);
    expect(board.getPieceAt(redPositions[0])).toEqual(redPiece);
    expect(board.getOccupiedSquares().get(redPositions[0])).toBe(redPiece.id);

    expect(board.getPiece(bluePiece.id)).toEqual(bluePiece);
    expect(board.getPositionOf(bluePiece.id)).toBe(bluePositions[0]);
    expect(board.getPieceAt(bluePositions[0])).toEqual(bluePiece);
    expect(board.getOccupiedSquares().get(bluePositions[0])).toBe(bluePiece.id);

    expect(board.getPiece(yellowPiece.id)).toEqual(yellowPiece);
    expect(board.getPositionOf(yellowPiece.id)).toBe(yellowPositions[0]);
    expect(board.getPieceAt(yellowPositions[0])).toEqual(yellowPiece);
    expect(board.getOccupiedSquares().get(yellowPositions[0])).toBe(yellowPiece.id);

    expect(board.getPiece(greenPiece.id)).toEqual(greenPiece);
    expect(board.getPositionOf(greenPiece.id)).toBe(greenPositions[0]);
    expect(board.getPieceAt(greenPositions[0])).toEqual(greenPiece);
    expect(board.getOccupiedSquares().get(greenPositions[0])).toBe(greenPiece.id);
  });

  test('rejects invalid squares as board positions', () => {
    const invalidSquares = [
      parseSquareId(1, 1),
      parseSquareId(1, 2),
      parseSquareId(2, 1),
      parseSquareId(2, 2),
    ];

    invalidSquares.forEach(squareId => {
      expect(board.isValidSquare(squareId)).toBe(false);
    });
  });

  test('placePiece updates piece positions and occupied squares for different colors', () => {
    const redPawn = redPieces[0];
    const bluePawn = bluePieces[0];
    const yellowPawn = yellowPieces[0];
    const greenPawn = greenPieces[0];

    const redInitial = redPositions[0];
    const blueInitial = bluePositions[0];
    const yellowInitial = yellowPositions[0];
    const greenInitial = greenPositions[0];

    const newRedPosition = parseSquareId(5, 5);
    const newBluePosition = parseSquareId(6, 6);
    const newYellowPosition = parseSquareId(7, 7);
    const newGreenPosition = parseSquareId(8, 8);

    expect(board.isOccupied(newRedPosition)).toBe(false);
    expect(board.isOccupied(newBluePosition)).toBe(false);
    expect(board.isOccupied(newYellowPosition)).toBe(false);
    expect(board.isOccupied(newGreenPosition)).toBe(false);

    board.placePiece(redPawn.id, newRedPosition);
    board.placePiece(bluePawn.id, newBluePosition);
    board.placePiece(yellowPawn.id, newYellowPosition);
    board.placePiece(greenPawn.id, newGreenPosition);

    expect(board.getPositionOf(redPawn.id)).toBe(newRedPosition);
    expect(board.getPieceAt(newRedPosition)).toEqual(redPawn);
    expect(board.isOccupied(newRedPosition)).toBe(true);
    expect(board.isOccupied(redInitial)).toBe(false);

    expect(board.getPositionOf(bluePawn.id)).toBe(newBluePosition);
    expect(board.getPieceAt(newBluePosition)).toEqual(bluePawn);
    expect(board.isOccupied(newBluePosition)).toBe(true);
    expect(board.isOccupied(blueInitial)).toBe(false);

    expect(board.getPositionOf(yellowPawn.id)).toBe(newYellowPosition);
    expect(board.getPieceAt(newYellowPosition)).toEqual(yellowPawn);
    expect(board.isOccupied(newYellowPosition)).toBe(true);
    expect(board.isOccupied(yellowInitial)).toBe(false);

    expect(board.getPositionOf(greenPawn.id)).toBe(newGreenPosition);
    expect(board.getPieceAt(newGreenPosition)).toEqual(greenPawn);
    expect(board.isOccupied(newGreenPosition)).toBe(true);
    expect(board.isOccupied(greenInitial)).toBe(false);

    expect(board.getOccupiedSquares().size).toBe(64);
  });
});
