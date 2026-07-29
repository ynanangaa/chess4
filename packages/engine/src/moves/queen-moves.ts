import { Board } from "../board";
import { Piece } from "../types";
import { QUEEN_DIRECTIONS, slideDestinations } from "./move-geometry";

export function queenDirections(): number[] {
  return [...QUEEN_DIRECTIONS];
}

export function queenMoves(queen: Piece, from: number, board: Board): number[] {
  return slideDestinations(queen, from, board, QUEEN_DIRECTIONS);
}