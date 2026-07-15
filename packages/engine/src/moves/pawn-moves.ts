import { Color, SquareCoordsOffset } from "../types";
import { Board } from "../board";
import { inverseParseCol, parseSquareCoords, parseSquareId, pushIfOccupantIsEnemy, translateSquareCoords } from "../utils";
import { Piece } from "../types";

export function forwardDirection(color: Color): SquareCoordsOffset {
  switch (color) {
    case Color.RED:
      return { rowDelta: 1, colDelta: 0 };
    case Color.YELLOW:
      return { rowDelta: -1, colDelta: 0 };
    case Color.BLUE:
      return { rowDelta: 0, colDelta: 1 };
    case Color.GREEN:
      return { rowDelta: 0, colDelta: -1 };
  }
}

function captureDirections(color: Color): SquareCoordsOffset[] {
  switch (color) {
    case Color.RED:
      return [
        { rowDelta: 1, colDelta: -1 },
        { rowDelta: 1, colDelta: 1 }
      ];

    case Color.YELLOW:
      return [
        { rowDelta: -1, colDelta: -1 },
        { rowDelta: -1, colDelta: 1 }
      ];

    case Color.BLUE:
      return [
        { rowDelta: -1, colDelta: 1 },
        { rowDelta: 1, colDelta: 1 }
      ];

    case Color.GREEN:
      return [
        { rowDelta: -1, colDelta: -1 },
        { rowDelta: 1, colDelta: -1 }
      ];
  }
}

export function enPassantCapturedPawnSquare(moveTo: number, color: Color): number {
  switch (color) {
    case Color.RED:
      return moveTo - 1;
    case Color.YELLOW:
      return moveTo + 1;
    case Color.BLUE:
      return moveTo - 14;
    case Color.GREEN:
      return moveTo + 14;
  }
}

export function pawnMoves(pawn: Piece, position: number, board: Board): number[] {

  const moves: number[] = [];
  const currentPosCoords = parseSquareCoords(position);

  // Forward move
  const forwardOffset = forwardDirection(pawn.color);
  const forwardCoords = translateSquareCoords(currentPosCoords, forwardOffset);

  if (forwardCoords) {
    const forwardPosition = parseSquareId(
      forwardCoords.row, 
       inverseParseCol(forwardCoords.col)
    );

    if (board.isValidSquare(forwardPosition) && !board.isOccupied(forwardPosition)) {
      moves.push(forwardPosition);
    }
  }

  // Captures
  const captureOffsets = captureDirections(pawn.color);

  for (const offset of captureOffsets) {
    const captureCoords = translateSquareCoords(currentPosCoords, offset);

    if (!captureCoords) continue;

    const capturePosition = parseSquareId(
      captureCoords.row, 
      inverseParseCol(captureCoords.col)
    );

    if (board.isValidSquare(capturePosition)) {
      pushIfOccupantIsEnemy(moves, pawn, board, capturePosition);
    }
  }

  return moves;
}
