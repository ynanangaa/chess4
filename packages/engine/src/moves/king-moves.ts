import { Board } from "../board";
import { Color, Piece } from "../types";
import { KING_DIRECTIONS, singleStepDestinations } from "./move-geometry";

export function castleDirectionOffset(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return kingSide ? 14 : -14;
    case Color.YELLOW:
      return kingSide ? -14 : 14;
    case Color.BLUE:
      return kingSide ? -1 : 1;
    case Color.GREEN:
      return kingSide ? 1 : -1;
  }
}

export function kingMoves(king: Piece, from: number, board: Board): number[] {
  return singleStepDestinations(king, from, board, KING_DIRECTIONS);
}