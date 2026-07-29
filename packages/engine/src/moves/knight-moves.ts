import { Board } from "../board";
import { Piece } from "../types";
import { KNIGHT_DIRECTIONS, singleStepDestinations } from "./move-geometry";

export function knightMoves(knight: Piece, from: number, board: Board): number[] {
  return singleStepDestinations(knight, from, board, KNIGHT_DIRECTIONS);
}