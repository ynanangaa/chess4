import { Board } from "../board";
import { Piece } from "../types";
import { BISHOP_DIRECTIONS, slideDestinations } from "./move-geometry";

export function bishopDirections(): number[] {
  return [...BISHOP_DIRECTIONS];
}

export function bishopMoves(bishop: Piece, from: number, board: Board): number[] {
  return slideDestinations(bishop, from, board, BISHOP_DIRECTIONS);
}