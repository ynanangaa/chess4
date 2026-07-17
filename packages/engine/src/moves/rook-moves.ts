import { Board } from "../board";
import { Color, Piece, SquareCoordsOffset } from "../types";
import { slidingMoves } from "../utils";
import { CastleSide } from "./move";

const ROOK_DIRECTION_OFFSETS: SquareCoordsOffset[] = [
  { rowDelta: -1, colDelta: 0 },
  { rowDelta: 1, colDelta: 0 },
  { rowDelta: 0, colDelta: -1 },
  { rowDelta: 0, colDelta: 1 }
];

export function rookCastleDirectionOffset(color: Color, castleSide: CastleSide): number {
  if (
    (color === Color.RED && castleSide === "kingside") ||
    (color === Color.YELLOW && castleSide === "queenside")
  ) {
    return -14;
  }

  if (
    (color === Color.RED && castleSide === "queenside") ||
    (color === Color.YELLOW && castleSide === "kingside")
  ) {
    return 14;
  }

  if (
    (color === Color.BLUE && castleSide === "kingside") ||
    (color === Color.GREEN && castleSide === "queenside")
  ) {
    return -1;
  }

  return 1;
}

export function rookDirectionOffsets(): SquareCoordsOffset[] {
  return [...ROOK_DIRECTION_OFFSETS];
}

export function rookMoves(rook: Piece, board: Board): number[] {
  return slidingMoves(rook.id, board, ROOK_DIRECTION_OFFSETS);
}
