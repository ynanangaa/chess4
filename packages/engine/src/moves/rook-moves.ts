import { Board } from "../board";
import { Color, Piece } from "../types";
import { BOARD_SIZE, ROOK_DIRECTIONS, slideDestinations } from "./move-geometry";
import { CastleSide } from "./move";

export function rookCastleDirectionOffset(color: Color, castleSide: CastleSide): number {
  if (
    (color === Color.RED && castleSide === "kingside") ||
    (color === Color.YELLOW && castleSide === "queenside")
  ) {
    return -BOARD_SIZE;
  }

  if (
    (color === Color.RED && castleSide === "queenside") ||
    (color === Color.YELLOW && castleSide === "kingside")
  ) {
    return BOARD_SIZE;
  }

  if (
    (color === Color.BLUE && castleSide === "queenside") ||
    (color === Color.GREEN && castleSide === "kingside")
  ) {
    return -1;
  }

  return 1;
}

export function rookDirections(): number[] {
  return [...ROOK_DIRECTIONS];
}

export function rookMoves(rook: Piece, from: number, board: Board): number[] {
  return slideDestinations(rook, from, board, ROOK_DIRECTIONS);
}