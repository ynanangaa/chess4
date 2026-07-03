import { Board } from "../board";
import { Piece } from "../types";
import { slidingMoves } from "../utils";

export function rookDirectionOffsets(): number[] {
  return [
    -1 // down
    , 1 // up
    , -14 // left
    , 14 // right
  ]
}

export function rookMoves(rook: Piece, board: Board): number[] {
  const directionOffsets = rookDirectionOffsets();
  return slidingMoves(rook.id, board, directionOffsets);
}