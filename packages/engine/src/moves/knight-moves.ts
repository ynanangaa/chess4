import { Board } from "../board";
import { Piece, SquareCoordsOffset } from "../types";
import { parseSquareCoords, pushIfEmptyOrEnemy, toSquareId, translateSquareCoords } from "../utils";

const KNIGHT_OFFSETS: SquareCoordsOffset[] = [
  { rowDelta: -2, colDelta: -1 },
  { rowDelta: -2, colDelta: 1 },
  { rowDelta: -1, colDelta: -2 },
  { rowDelta: -1, colDelta: 2 },
  { rowDelta: 1, colDelta: -2 },
  { rowDelta: 1, colDelta: 2 },
  { rowDelta: 2, colDelta: -1 },
  { rowDelta: 2, colDelta: 1 }
];

export function knightMoves(knight: Piece, position: number, board: Board): number[] {
  const moves: number[] = [];
  const currentCoords = parseSquareCoords(position);

  for (const offset of KNIGHT_OFFSETS) {
    const translated = translateSquareCoords(currentCoords, offset);
    if (!translated) continue;

    const destination = toSquareId(translated);
    if (board.isValidSquare(destination)) {
      pushIfEmptyOrEnemy(moves, knight, board, destination);
    }
  }

  return moves;
}
