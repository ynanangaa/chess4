import { Board } from "../board";
import { Color, Piece, SquareCoordsOffset } from "../types";
import { parseSquareCoords, pushIfOccupantIsEnemy, toSquareId, translateSquareCoords } from "../utils";

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
  const currentCoords = parseSquareCoords(position);
  const forwardCoords = translateSquareCoords(currentCoords, forwardDirection(pawn.color));

  if (forwardCoords) {
    const forwardPosition = toSquareId(forwardCoords);

    if (board.isValidSquare(forwardPosition) && !board.isOccupied(forwardPosition)) {
      moves.push(forwardPosition);
    }
  }

  for (const offset of captureDirections(pawn.color)) {
    const captureCoords = translateSquareCoords(currentCoords, offset);
    if (!captureCoords) continue;

    const capturePosition = toSquareId(captureCoords);
    if (board.isValidSquare(capturePosition)) {
      pushIfOccupantIsEnemy(moves, pawn, board, capturePosition);
    }
  }

  return moves;
}
