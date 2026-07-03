import { Board } from "../board";
import { Piece } from "../types";
import { pushIfEmptyOrEnemy } from "../utils";

export function kingMoves(king: Piece, position: number, board: Board): number[] {

  const moves: number[] = [];
  const kingTranslations = [
    -15, -14, -13, -1, 1, 13, 14, 15
  ];
  for (const transl of kingTranslations) {
    const newPosition = position + transl;
    if (board.isValidSquare(newPosition)) {
      pushIfEmptyOrEnemy(moves, king, board, newPosition);
    }
  }
  return moves;
}