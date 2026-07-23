/**
 * The overall lifecycle status of a game.
 *
 * ⚠️ This is a numeric enum. If game state is ever serialized (saved,
 * sent over the network, etc.), the underlying numeric values
 * (`OVER = 0`, `RUNNING = 1`) are what persist — reordering these members
 * would be a breaking change for any stored/serialized data.
 */
export enum GameStatus {
  /** The game has ended (checkmate, stalemate, resignation, etc.). */
  OVER,
  /** The game is in progress and accepting moves. */
  RUNNING,
}