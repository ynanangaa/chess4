import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";
import { inverseParseCol, parseSquareCoords, parseSquareId, pushIfEmptyOrEnemy, translateSquareCoords } from "../utils";

export function knightMoves(knight: Piece, position: number, board: Board): number[] {

  const moves: number[] = [];

  const knightOffsets: SquareCoordsOffset[] = [
    { rowDelta: -2, colDelta: -1 },
    { rowDelta: -2, colDelta: 1 },
    { rowDelta: -1, colDelta: -2 },
    { rowDelta: -1, colDelta: 2 },
    { rowDelta: 1, colDelta: -2 },
    { rowDelta: 1, colDelta: 2 },
    { rowDelta: 2, colDelta: -1 },
    { rowDelta: 2, colDelta: 1 },
  ];

  const currentPosCoords = parseSquareCoords(position);

  for (const offset of knightOffsets) {
    const translated = translateSquareCoords(currentPosCoords, offset);

    if (!translated) continue;

    const newPos = parseSquareId(
      translated.row, 
      inverseParseCol(translated.col)
    );

    if (board.isValidSquare(newPos)) {
      pushIfEmptyOrEnemy(moves, knight, board, newPos);
    }
  }

  return moves;
}