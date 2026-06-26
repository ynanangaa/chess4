/*
 * This file contains all the squares where the en-passant move is possible
 * for any player color.
 *
 * These positions are the borders of the square whose vertices 
 * are e5, e10, j5, and j10.
 */

export const EN_PASSANT_SQUARES = new Set<string>([
  'e5', 'e6', 'e7', 'e8', 'e9', 'e10',
  'f5',                         'f10',
  'g5',                         'g10',
  'h5',                         'h10',
  'i5',                         'i10',
  'j5', 'j6', 'j7', 'j8', 'j9', 'j10'
]);