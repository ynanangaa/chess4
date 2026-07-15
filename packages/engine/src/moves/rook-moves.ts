import { Board } from "../board";
import { Color, Piece, SquareCoordsOffset } from "../types";
import { slidingMoves } from "../utils";

export function rookCastleDirectionOffset(color: Color, kingSide: "kingside" | "queenside"): number {
  if ((color === Color.RED && kingSide === "kingside") 
    ||(color === Color.YELLOW && kingSide === "queenside"))
    return -14;
  else if ((color === Color.RED && kingSide === "queenside") 
        || (color === Color.YELLOW && kingSide === "kingside"))
    return 14;
  else if ((color === Color.BLUE && kingSide === "kingside") 
        || (color === Color.GREEN && kingSide === "queenside"))
    return -1;
  else return 1;
}

export function rookDirectionOffsets(): SquareCoordsOffset[] {
  return [
    { rowDelta: -1, colDelta: 0 }, // down
    { rowDelta: 1, colDelta: 0 }, // up
    { rowDelta: 0, colDelta: -1 }, // left
    { rowDelta: 0, colDelta: 1 } // right
  ]
}

export function rookMoves(rook: Piece, board: Board): number[] {
  const directionOffsets = rookDirectionOffsets();
  return slidingMoves(rook.id, board, directionOffsets);
}