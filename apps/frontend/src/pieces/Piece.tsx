import type { Piece as EnginePiece } from '@chess4/engine';
import { getPieceGlyph, getPieceColorClass } from './pieceGlyphs';

interface PieceProps {
  piece: EnginePiece;
  inactive?: boolean;
}

export function Piece({ piece, inactive = false }: PieceProps) {
  return (
    <span
      className={[
        'select-none pointer-events-none text-[min(6vw,40px)] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]',
        getPieceColorClass(piece.color),
        inactive ? 'opacity-35 grayscale' : '',
      ].join(' ')}
      aria-label={`${piece.color} ${piece.type || 'pawn'}${inactive ? ' (inactive)' : ''}`}
    >
      {getPieceGlyph(piece.type)}
    </span>
  );
}