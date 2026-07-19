import { Board } from "../board";
import { Color, Piece, SquareCoordsOffset } from "../types";
import { parseSquareCoords, pushIfEmptyOrEnemy, toSquareId, translateSquareCoords } from "../utils";

const KING_OFFSETS: SquareCoordsOffset[] = [
  { rowDelta: -1, colDelta: -1 },
  { rowDelta: -1, colDelta: 0 },
  { rowDelta: -1, colDelta: 1 },
  { rowDelta: 0, colDelta: -1 },
  { rowDelta: 0, colDelta: 1 },
  { rowDelta: 1, colDelta: -1 },
  { rowDelta: 1, colDelta: 0 },
  { rowDelta: 1, colDelta: 1 }
];

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

export function kingMoves(king: Piece, position: number, board: Board): number[] {
  const moves: number[] = [];
  const currentCoords = parseSquareCoords(position);

  for (const offset of KING_OFFSETS) {
    const translated = translateSquareCoords(currentCoords, offset);
    if (!translated) continue;

    const destination = toSquareId(translated);
    if (board.isValidSquare(destination)) {
      pushIfEmptyOrEnemy(moves, king, board, destination);
    }
  }

  return moves;
}
