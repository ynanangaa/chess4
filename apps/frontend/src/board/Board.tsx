import { useMemo } from 'react';
import type { ReadonlyBoard as EngineBoard, Color } from '@chess4/engine';
import { buildAllSquares, toGridPosition, BOARD_SIZE } from './boardGeometry';
import { Piece } from '../pieces/Piece';

interface BoardProps {
  board: EngineBoard;
  selectedSquareId?: number;
  selectedColor?: Color;
  legalDestinations?: number[];
  onSquareClick?: (squareId: number) => void;
}

/**
 * Player-specific classes for the selected-square ring, legal-move dot,
 * and legal-capture ring.
 *
 * These are explicitly listed rather than dynamically generated so
 * Tailwind can detect and include them in the production CSS build.
 */
const HIGHLIGHT_CLASSES: Record<
  Color,
  {
    selected: string;
    destination: string;
    capture: string;
  }
> = {
  red: {
    selected: 'ring-red-500',
    destination: 'bg-red-500/80',
    capture: 'border-red-500/80',
  },
  blue: {
    selected: 'ring-blue-500',
    destination: 'bg-blue-500/80',
    capture: 'border-blue-500/80',
  },
  yellow: {
    selected: 'ring-yellow-400',
    destination: 'bg-yellow-400/80',
    capture: 'border-yellow-400/80',
  },
  green: {
    selected: 'ring-green-500',
    destination: 'bg-green-500/80',
    capture: 'border-green-500/80',
  },
};

export function Board({
  board,
  selectedSquareId,
  selectedColor,
  legalDestinations = [],
  onSquareClick,
}: BoardProps) {
  const squares = useMemo(() => buildAllSquares(), []);

  const legalDestinationSet = useMemo(
    () => new Set(legalDestinations),
    [legalDestinations]
  );

  const highlights = selectedColor
    ? HIGHLIGHT_CLASSES[selectedColor]
    : undefined;

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
              isValid
                ? (isDark ? 'bg-emerald-400' : 'bg-emerald-100')
                : 'bg-transparent',
              isValid ? 'cursor-pointer' : '',
              isSelected && highlights
                ? `ring-4 ring-inset ${highlights.selected}`
                : '',
            ].join(' ')}
          >
            {piece && <Piece piece={piece} inactive={!board.isPieceActive(piece.id)} />}

            {isLegalDestination && piece && highlights && (
              /*
               * Legal destination containing a capturable piece: preserve
               * visibility of the piece while showing a colored ring.
               */
              <span
                className={[
                  'absolute inset-1 rounded-full border-4 pointer-events-none',
                  highlights.capture,
                ].join(' ')}
              />
            )}

            {isLegalDestination && !piece && highlights && (
              /* Legal destination on an empty square: a colored dot. */
              <span
                className={[
                  'absolute w-1/3 h-1/3 rounded-full pointer-events-none',
                  highlights.destination,
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}