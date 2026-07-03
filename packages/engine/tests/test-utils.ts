import { SquareCoords } from '../src/types';

export function sortMoves(moves: SquareCoords[]): SquareCoords[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}
