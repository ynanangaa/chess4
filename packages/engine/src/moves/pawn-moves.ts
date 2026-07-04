import { Color } from "../types";
import { Board } from "../board";
import { pushIfOccupantIsEnemy } from "../utils";
import { Piece } from "../types";

export function forwardDirectionOffsets(color: Color): number {
  switch (color) {
    case Color.RED:
      return 1;
    case Color.YELLOW:
      return -1;
    case Color.BLUE:
      return 14;
    case Color.GREEN:
      return -14;
  }
}

function captureDirectionOffsets(color: Color): number[] {
  switch (color) {
    case Color.RED:
      return [-13, 15];
    case Color.YELLOW:
      return [-15, 13];
    case Color.BLUE:
      return [13, 15];
    case Color.GREEN:
      return [-15, -13];
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
  
  // Standard forward move
  const moves: number[] = [];
  const forwardOffset = forwardDirectionOffsets(pawn.color);
  const forwardPosition = position + forwardOffset;

  if (board.isValidSquare(forwardPosition) && !board.isOccupied(forwardPosition)) {
    moves.push(forwardPosition);
  }

  // Diagonal captures
  const captureOffsets = captureDirectionOffsets(pawn.color);
  for (const offset of captureOffsets) {
    const capturePosition = position + offset;
    if (board.isValidSquare(capturePosition)) {
      pushIfOccupantIsEnemy(moves, pawn, board, capturePosition);
    }
  }

  return moves;
}
