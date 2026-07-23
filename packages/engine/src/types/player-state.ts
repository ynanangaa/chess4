/**
 * The tactical/game-ending state of an individual player at a given point
 * in the game.
 *
 * ⚠️ This is a numeric enum. As with {@link GameStatus}, if player state
 * is ever serialized, the underlying numeric values are what persist —
 * be cautious about reordering members if any stored/serialized data
 * depends on the current numbering.
 */
export enum PlayerState {
  /** No special condition; player has a normal turn. */
  NORMAL,
  /** Player's king is currently under attack. */
  CHECK,
  /** Player's king is under attack with no legal move to escape. */
  CHECKMATE,
  /** Player has no legal moves but is not in check. */
  STALEMATE,
  /** Player has voluntarily resigned from the game. */
  RESIGNED,
  /** Player has exceeded their allotted time. */
  TIMED_OUT,
}