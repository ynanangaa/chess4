import type { Piece as EnginePiece } from '@chess4/engine';
import { getPieceGlyph, getPieceColorClass } from './pieceGlyphs';

interface PieceProps {
  piece: EnginePiece;
}

export function Piece({ piece }: PieceProps) {
  return (
    <span
      className={`select-none pointer-events-none text-[min(6vw,40px)] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] ${getPieceColorClass(piece.color)}`}
      aria-label={`${piece.color} ${piece.type || 'pawn'}`}
    >
      {getPieceGlyph(piece.type)}
    </span>
  );
}