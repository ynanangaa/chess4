import { Board } from "../board";
import { Piece } from "../types";
import { pushIfEmptyOrEnemy } from "../utils";

export function knightMoves(knight: Piece, position: number, board: Board): number[] {
  
  const moves: number[] = [];
  const knightTranslations: number[] = [
    -29, -27, -16, -12, 12, 16, 27, 29 
  ]
  for (const transl of knightTranslations) {
    const newPos = position + transl;
    if (board.isValidSquare(newPos)) {
      pushIfEmptyOrEnemy(moves, knight, board, newPos);
    }
  }
  return moves;
}