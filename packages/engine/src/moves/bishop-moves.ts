import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";
import { slidingMoves } from "../utils";

export function bishopDirectionOffsets(): SquareCoordsOffset[] {
  return [
    { rowDelta: -1, colDelta: -1 }, // bottom-left
    { rowDelta: 1, colDelta: 1 }, // up-right
    { rowDelta: 1, colDelta: -1 }, // up-left
    { rowDelta: -1, colDelta: 1 } // bottom-right
  ]
}

export function bishopMoves(bishop: Piece, board: Board): number[] {
  const directionOffsets = bishopDirectionOffsets();
  return slidingMoves(bishop.id, board, directionOffsets);
}