import { PieceType, Color } from '@chess4/engine';

/**
 * Unicode chess glyphs are only defined for White/Black pairs, so we
 * always use the "white" glyph variant and apply player color via CSS
 * (text color) instead — this also makes future re-theming trivial
 * (e.g. swapping in custom piece art per color later) without touching
 * this lookup table.
 */
const PIECE_GLYPHS: Record<PieceType, string> = {
  [PieceType.KING]: '♚',
  [PieceType.QUEEN]: '♛',
  [PieceType.ROOK]: '♜',
  [PieceType.BISHOP]: '♝',
  [PieceType.KNIGHT]: '♞',
  [PieceType.PAWN]: '♟\uFE0E',
};

export function getPieceGlyph(type: PieceType): string {
  return PIECE_GLYPHS[type];
}

/**
 * Tailwind text-color classes per player color, plus a shared subtle
 * outline (via drop-shadow) so pieces stay readable regardless of which
 * square shade they land on.
 */
const PIECE_COLOR_CLASSES: Record<Color, string> = {
  [Color.RED]: 'text-red-600',
  [Color.BLUE]: 'text-blue-600',
  [Color.YELLOW]: 'text-yellow-500',
  [Color.GREEN]: 'text-green-600',
};

export function getPieceColorClass(color: Color): string {
  return PIECE_COLOR_CLASSES[color];
}