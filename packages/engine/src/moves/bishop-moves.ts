import { Board } from "../board";
import { Piece } from "../types";
import { slidingMoves } from "../utils";

export function bishopDirectionOffsets(): number[] {
  return [
    -15, // bottom-left
    15, // up-right
    -13, // up-left
    13 // bottom-right
  ]
}

export function bishopMoves(bishop: Piece, board: Board): number[] {
  const directionOffsets = bishopDirectionOffsets();
  return slidingMoves(bishop.id, board, directionOffsets);
}