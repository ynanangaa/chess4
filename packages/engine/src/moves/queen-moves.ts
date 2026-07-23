import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";
import { slidingMoves } from "../utils/utils";
import { bishopDirectionOffsets } from "./bishop-moves";
import { rookDirectionOffsets } from "./rook-moves";

export function queenDirectionOffsets(): SquareCoordsOffset[] {
  return [
    ...rookDirectionOffsets(),
    ...bishopDirectionOffsets()
  ];
}

export function queenMoves(queen: Piece, board: Board): number[] {
  return slidingMoves(queen.id, board, queenDirectionOffsets());
}
