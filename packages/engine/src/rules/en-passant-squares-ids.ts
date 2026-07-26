/*
 * This file contains all the squares ids where the en-passant move is possible
 * for any player color.
 *
 * Geometry: each axis-aligned line corresponds to the squares immediately
 * adjacent to one color's pawn double-step landing row/column, on the side
 * closer to the board's center:
 *   - Row 5  (col 4–11): adjacent to RED's double-step landing row (row 4)
 *   - Row 10 (col 4–11): adjacent to YELLOW's double-step landing row (row 11)
 *   - Col 5  (row 4–11): adjacent to BLUE's double-step landing column (col 4)
 *   - Col 10 (row 4–11): adjacent to GREEN's double-step landing column (col 11)
 *
 * Each line spans all 8 columns/rows (4 through 11) rather than just 5
 * through 10, since every one of a color's 8 pawns can double-step,
 * covering that color's full range of starting columns/rows.
 *
 * Known limitation: only the "inner" (center-facing) side of each landing
 * line is covered here. The "outer" side (row 3, col 3, row 12, col 12)
 * would only ever be relevant if a pawn had already diagonally captured
 * its way off its normal fixed row/column — a rare edge case that is
 * currently not handled.
 */

export const EN_PASSANT_SQUARES_IDS = new Set<number>([
  // Row 5 (RED's inner side), columns 4–11
  46, 60, 74, 88, 102, 116, 130, 144,

  // Row 10 (YELLOW's inner side), columns 4–11
  51, 65, 79, 93, 107, 121, 135, 149,

  // Column 5 (BLUE's inner side), rows 4–11
  59, 60, 61, 62, 63, 64, 65, 66,

  // Column 10 (GREEN's inner side), rows 4–11
  129, 130, 131, 132, 133, 134, 135, 136
]);