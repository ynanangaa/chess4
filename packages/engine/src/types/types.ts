/**
 * Primitive, non-class types shared across the engine: board
 * coordinates, piece shape, and player/game status.
 */

// ─── Board coordinates ─────────────────────────────────────────────────────

/**
 * A column label on the four-player board, spanning `a` through `n`
 * (14 columns), consistent with the board's 14×14 coordinate space.
 */
export type Col =
  | "a" | "b" | "c" | "d"
  | "e" | "f" | "g" | "h"
  | "i" | "j" | "k" | "l"
  | "m" | "n";

/**
 * A row number on the four-player board, spanning `1` through `14`,
 * consistent with the board's 14×14 coordinate space.
 */
export type Row =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/**
 * The coordinates of a square on the board, expressed as a row/column
 * pair rather than a flat square id.
 */
export interface SquareCoords {
  row: Row;
  col: Col;
}

// ─── Player color ────────────────────────────────────────────────────────

/**
 * The four player colors in a four-player chess game.
 *
 * Defined as a `const` object plus a derived union type rather than a
 * TypeScript `enum`, so the underlying values are plain, self-describing
 * strings, while every `Color.RED`-style call site keeps working
 * unchanged.
 *
 * Turn order convention (see {@link Game}) follows this list:
 * RED → BLUE → YELLOW → GREEN.
 */
export const Color = {
  RED: 'red',
  BLUE: 'blue',
  YELLOW: 'yellow',
  GREEN: 'green',
} as const;

export type Color = (typeof Color)[keyof typeof Color];

// ─── Game lifecycle ────────────────────────────────────────────────────────

/** The overall lifecycle status of a game. */
export const GameStatus = {
  /** The game has ended (checkmate, stalemate, resignation, etc.). */
  OVER: 'OVER',
  /** The game is in progress and accepting moves. */
  RUNNING: 'RUNNING',
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

// ─── Player status ─────────────────────────────────────────────────────────

/**
 * A player's combat-related standing: whether their king is currently
 * under attack, and whether that has produced a game-ending condition
 * for them.
 */
export interface CombatStatus {
  /** Player's king is currently under attack. */
  inCheck: boolean;
  /** Player's king is under attack with no legal move to escape. */
  checkmated: boolean;
  /** Player has no legal moves but is not in check. */
  stalemated: boolean;
}

/**
 * A player's voluntary/administrative standing.
 */
export interface ForfeitStatus {
  /** Player has voluntarily resigned from the game. */
  resigned: boolean;
  /** Player has exceeded their allotted time. */
  timedOut: boolean;
}

/**
 * The complete status of an individual player at a given point in the
 * game.
 *
 * A player — and by extension every one of their pieces — is
 * *inactive* whenever any of `checkmated`, `stalemated`, `resigned`, or
 * `timedOut` is `true`. An inactive piece stays on the board as a live,
 * capturable obstacle; it simply can never move, capture, or give check
 * (see {@link Piece}).
 *
 * @remarks
 * This is checked, not stored, per piece — see {@link Piece} for why.
 */
export type PlayerStatus = CombatStatus & ForfeitStatus;

// ─── Piece type ────────────────────────────────────────────────────────────

/**
 * The type of a chess piece, represented by its standard algebraic
 * notation letter.
 */
export const PieceType = {
  PAWN: 'P',
  KNIGHT: 'N',
  BISHOP: 'B',
  ROOK: 'R',
  QUEEN: 'Q',
  KING: 'K',
} as const;

export type PieceType = (typeof PieceType)[keyof typeof PieceType];

// ─── Piece ──────────────────────────────────────────────────────────────

/**
 * A chess piece: a plain, fully immutable value identified by a stable
 * `id`, its `type`, its owning `color`, and (for every type but the
 * king) its point value.
 *
 * @remarks
 * Deliberately has no mutable fields and no methods — not even an
 * `active` flag. Whether a piece can currently move, capture, or give
 * check is entirely a function of its owner's {@link PlayerStatus}, not
 * of the piece itself: that status can never differ between two pieces
 * of the same color, so storing it per piece would only duplicate the
 * same fact across every piece of that color. Being a plain
 * JSON-serializable object also means a `Piece` can be safely duplicated
 * via `JSON.stringify`/`JSON.parse` when cloning a board, with no risk
 * of shared references leaking between clones.
 *
 * A piece remains present on the board — occupying its square, and
 * capturable — for as long as it hasn't been captured, regardless of
 * whether its owner's status currently makes it inactive.
 */
export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  /** Absent only for the king, which carries no point value. */
  points?: number;
}

/**
 * A piece that has been captured during the game, retaining its original
 * identity plus a record of which color captured it.
 */
export interface CapturedPiece extends Piece {
  /** The color of the player who captured this piece. */
  capturedBy: Color;
  /**
   * Whether this piece was active (see {@link Board.isPieceActive}) at
   * the exact moment it was captured. Used to withhold capture points
   * for capturing a piece that already belonged to an eliminated/frozen
   * player (see `DefaultRuleSet.awardCapturePoints`).
   */
  wasActive: boolean;
}