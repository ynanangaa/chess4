import { Color, GameStatus, PlayerStatus } from "../types";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

function defaultPlayerStatus(): PlayerStatus {
  return {
    inCheck: false,
    checkmated: false,
    stalemated: false,
    resigned: false,
    timedOut: false
  };
}

/**
 * Stores mutable game-wide state that is independent of board piece
 * placement: turn order, game lifecycle status, per-player status, and
 * the move clock used by draw rules.
 *
 * `GameState` is used internally by {@link Game}, but is exposed through
 * {@link Game.getGameState}. Consumers should normally prefer the
 * convenience methods on `Game` unless they intentionally need direct
 * state manipulation.
 *
 * Each player's status is a small set of independent boolean flags (see
 * {@link PlayerStatus}) rather than a single exclusive state. Unlike the
 * old single-state model this replaces, these conditions genuinely
 * aren't mutually exclusive — a resigned player's abandoned position may
 * still later be found checkmated, for instance — so there's no
 * reconciliation logic needed here at all; each flag is set
 * independently and stays set.
 */
export class GameState {
  /** The color whose turn is currently being processed. */
  private currentPlayerColor: Color = Color.RED;

  /** The overall lifecycle status of the game. */
  private status: GameStatus = GameStatus.RUNNING;

  /** Status flags for each player color. */
  private playerStatuses = new Map<Color, PlayerStatus>();

  /**
   * Number of consecutive turns without a capture or pawn move, used by
   * the four-player adaptation of the 50-move draw rule.
   */
  private moveClock = 0;

  /**
   * Creates game state for a new game.
   *
   * The game begins with RED to move, status `RUNNING`, a move clock of
   * zero, and every player's status flags cleared.
   */
  constructor() {
    for (const color of PLAYER_COLORS) {
      this.playerStatuses.set(color, defaultPlayerStatus());
    }
  }

  /** Returns the color whose turn is currently active. */
  public getCurrentPlayerColor(): Color {
    return this.currentPlayerColor;
  }

  /** Returns the overall lifecycle status of the game. */
  public getStatus(): GameStatus {
    return this.status;
  }

  /**
   * Returns a color's current status.
   *
   * The returned object is a copy; mutating it does not affect this
   * `GameState`.
   *
   * @param color - The player color to inspect.
   */
  public getPlayerStatus(color: Color): PlayerStatus {
    return { ...this.playerStatuses.get(color)! };
  }

  /**
   * Returns every color's current status.
   *
   * Both the returned map and each contained status object are copies,
   * so mutating them does not affect this `GameState`.
   */
  public getAllPlayerStatuses(): Map<Color, PlayerStatus> {
    return new Map(
      Array.from(this.playerStatuses.entries()).map(([color, status]) => [
        color,
        { ...status }
      ])
    );
  }

  /**
   * Returns the current move clock.
   *
   * The clock is maintained by the active ruleset and is used for
   * 50-move-rule draw detection.
   */
  public getMoveClock(): number {
    return this.moveClock;
  }

  /** Increments the move clock by one. */
  public incrementMoveClock(): void {
    this.moveClock += 1;
  }

  /** Resets the move clock to zero, normally after a capture or pawn move. */
  public resetMoveClock(): void {
    this.moveClock = 0;
  }

  /**
   * Sets the color whose turn is currently active.
   *
   * This method does not validate turn order or whether the selected player
   * is active; callers are responsible for enforcing those rules.
   */
  public setCurrentPlayerColor(color: Color): void {
    this.currentPlayerColor = color;
  }

  /** Sets the overall lifecycle status of the game. */
  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  /**
   * Updates a subset of a color's status flags, leaving the rest
   * unchanged.
   *
   * @param color - The player color to update.
   * @param patch - The status field(s) to change.
   */
  public updatePlayerStatus(color: Color, patch: Partial<PlayerStatus>): void {
    const current = this.playerStatuses.get(color)!;
    this.playerStatuses.set(color, { ...current, ...patch });
  }
}