/*
 * This file contains all the squares ids where the en-passant move is possible
 * for any player color.
 *
 * These positions are the borders of the square whose vertices 
 * are e5, e10, j5, and j10.
 */

export const EN_PASSANT_SQUARES_IDS = new Set<number>([
  60,  61,  62,  63,  64,  65,
  74,                      79,
  88,                      93,
  102,                     107,
  116,                     121,
  130, 131, 132, 133, 134, 135
]);