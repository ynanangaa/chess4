import { Board } from '../src/board';
import { SquareCoords } from '../src/types';

export function sortMoves(moves: SquareCoords[]): SquareCoords[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}

export function clearBoardExcept(board: Board, ...pieceIds: string[]) {
  board.getSquares().forEach(square => {
    if (square.occupant && !pieceIds.includes(square.occupant.getId())) {
      square.occupant = undefined;
    }
  });
}
