import { rookDirectionOffsets } from "./rook-moves";
import { bishopDirectionOffsets } from "./bishop-moves";
import { slidingMoves } from "../utils";
import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";

export function queenDirectionOffsets(): SquareCoordsOffset[] {
  return [
    ...rookDirectionOffsets(),
    ...bishopDirectionOffsets()
  ];
}

export function queenMoves(queen: Piece, board: Board): number[] {
  const directionOffsets = queenDirectionOffsets();
  return slidingMoves(queen.id, board, directionOffsets);
}