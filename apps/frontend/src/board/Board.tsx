import { useMemo } from 'react';
import type { Board as EngineBoard } from '@chess4/engine';
import { buildAllSquares, toGridPosition, BOARD_SIZE } from './boardGeometry';
import { Piece } from '../pieces/Piece';

interface BoardProps {
  board: EngineBoard;
  selectedSquareId?: number;
  legalDestinations?: number[];
  onSquareClick?: (squareId: number) => void;
}

export function Board({
  board,
  selectedSquareId,
  legalDestinations = [],
  onSquareClick,
}: BoardProps) {
  const squares = useMemo(() => buildAllSquares(), []);
  const legalDestinationSet = useMemo(
    () => new Set(legalDestinations),
    [legalDestinations]
  );

  return (
    <div
      className="grid aspect-square w-full max-w-[700px] mx-auto border border-slate-700"
      style={{
        gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
      }}
    >
      {squares.map(({ squareId, row, col }) => {
        const isValid = board.isValidSquare(squareId);
        const { gridRow, gridCol } = toGridPosition(row, col);
        const isDark = (row + col) % 2 === 0;
        const piece = isValid ? board.getPieceAt(squareId) : undefined;
        const isSelected = squareId === selectedSquareId;
        const isLegalDestination = legalDestinationSet.has(squareId);

        return (
          <div
            key={squareId}
            style={{ gridRowStart: gridRow, gridColumnStart: gridCol }}
            onClick={isValid ? () => onSquareClick?.(squareId) : undefined}
            className={[
              'relative flex items-center justify-center',
              isValid ? (isDark ? 'bg-emerald-400' : 'bg-emerald-100') : 'bg-transparent',
              isValid ? 'cursor-pointer' : '',
              isSelected ? 'ring-4 ring-inset ring-yellow-400' : '',
            ].join(' ')}
          >
            {piece && <Piece piece={piece} />}

            {isLegalDestination && piece && (
              // Legal destination that contains a capturable piece: draw a
              // ring around the edge so the piece underneath stays visible.
              <span className="absolute inset-1 rounded-full border-4 border-yellow-400/80 pointer-events-none" />
            )}

            {isLegalDestination && !piece && (
              // Legal destination on an empty square: a small dot.
              <span className="absolute w-1/3 h-1/3 rounded-full bg-yellow-400/80 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}