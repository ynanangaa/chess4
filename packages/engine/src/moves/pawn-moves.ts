import { Board } from "../board";
import { Color, Piece } from "../types";
import { stepInDirection } from "./move-geometry";

export function forwardDirection(color: Color): number {
  switch (color) {
    case Color.RED: return 1;
    case Color.YELLOW: return -1;
    case Color.BLUE: return 14;
    case Color.GREEN: return -14;
  }
}

function captureDirections(color: Color): number[] {
  switch (color) {
    case Color.RED: return [-13, 15];
    case Color.YELLOW: return [-15, 13];
    case Color.BLUE: return [13, 15];
    case Color.GREEN: return [-15, -13];
  }
}

export function pawnMoves(pawn: Piece, from: number, board: Board): number[] {
  const moves: number[] = [];

  const forward = stepInDirection(from, forwardDirection(pawn.color));
  if (forward !== undefined && board.isValidSquare(forward) && !board.isOccupied(forward)) {
    moves.push(forward);
  }

  for (const direction of captureDirections(pawn.color)) {
    const to = stepInDirection(from, direction);
    if (to === undefined || !board.isValidSquare(to)) continue;

    const occupant = board.getPieceAt(to);
    if (occupant && occupant.color !== pawn.color) moves.push(to);
  }

  return moves;
}