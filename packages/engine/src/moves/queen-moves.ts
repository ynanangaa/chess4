import { rookDirectionOffsets } from "./rook-moves";
import { bishopDirectionOffsets } from "./bishop-moves";
import { slidingMoves } from "../utils";
import { Board } from "../board";
import { Piece } from "../types";

export function queenDirectionOffsets(): number[] {
  return [
    ...rookDirectionOffsets(),
    ...bishopDirectionOffsets()
  ];
}

export function queenMoves(queen: Piece, board: Board): number[] {
  const directionOffsets = queenDirectionOffsets();
  return slidingMoves(queen.id, board, directionOffsets);
}