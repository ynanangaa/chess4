import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";
import { slidingMoves } from "../utils";

const BISHOP_DIRECTION_OFFSETS: SquareCoordsOffset[] = [
  { rowDelta: -1, colDelta: -1 },
  { rowDelta: -1, colDelta: 1 },
  { rowDelta: 1, colDelta: -1 },
  { rowDelta: 1, colDelta: 1 }
];

export function bishopDirectionOffsets(): SquareCoordsOffset[] {
  return [...BISHOP_DIRECTION_OFFSETS];
}

export function bishopMoves(bishop: Piece, board: Board): number[] {
  return slidingMoves(bishop.id, board, BISHOP_DIRECTION_OFFSETS);
}
