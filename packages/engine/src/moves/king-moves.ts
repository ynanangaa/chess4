import { Board } from "../board";
import { Color, Piece } from "../types";
import { pushIfEmptyOrEnemy } from "../utils";

export function castleDirectionOffset(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      if(kingSide) return 14;
      return -14;
    case Color.YELLOW:
      if(kingSide) return -14;
      return 14;
    case Color.BLUE:
      if(kingSide) return 1;
      return -1;
    case Color.GREEN:
      if(kingSide) return -1
      return 1;
  }
}

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