import { Board } from "../board";
import { Color, Piece } from "../types";
import { inverseParseCol, parseSquareCoords, parseSquareId, pushIfEmptyOrEnemy, translateSquareCoords } from "../utils";

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

  const kingOffsets = [
    { rowDelta: -1, colDelta: -1 },
    { rowDelta: -1, colDelta: 0 },
    { rowDelta: -1, colDelta: 1 },
    { rowDelta: 0, colDelta: -1 },
    { rowDelta: 0, colDelta: 1 },
    { rowDelta: 1, colDelta: -1 },
    { rowDelta: 1, colDelta: 0 },
    { rowDelta: 1, colDelta: 1 },
  ];

  const currentPosCoords = parseSquareCoords(position);

  for (const offset of kingOffsets) {
    const translated = translateSquareCoords(currentPosCoords, offset);

    if (!translated) continue;

    const newPosition = parseSquareId(
      translated.row, 
      inverseParseCol(translated.col)
    );

    if (board.isValidSquare(newPosition)) {
      pushIfEmptyOrEnemy(moves, king, board, newPosition);
    }
  }

  return moves;
}