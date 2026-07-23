import { Color, GameStatus, PlayerState } from "../types";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

/**
 * Stores mutable game-wide state that is independent of board piece
 * placement: turn order, game lifecycle status, per-player states, and
 * the move clock used by draw rules.
 *
 * `GameState` is used internally by {@link Game}, but is exposed through
 * {@link Game.getGameState}. Consumers should normally prefer the
 * convenience methods on `Game` unless they intentionally need direct
 * state manipulation.
 *
 * Each player owns a list of states rather than a single state. This allows
 * forfeit or terminal states such as `RESIGNED`, `TIMED_OUT`, `CHECKMATE`,
 * and `STALEMATE` to coexist in the stored state list when relevant.
 */
export class GameState {
  /** The color whose turn is currently being processed. */
  private currentPlayerColor: Color = Color.RED;

  /** The overall lifecycle status of the game. */
  private status: GameStatus = GameStatus.RUNNING;

  /**
   * States associated with each player color.
   *
   * The last state in each array is returned by {@link getPlayerState};
   * the full list is available through {@link getPlayerStates}.
   */
  private playerStates = new Map<Color, PlayerState[]>();

  /**
   * Number of consecutive turns without a capture or pawn move, used by
   * the four-player adaptation of the 50-move draw rule.
   */
  private moveClock = 0;

  /**
   * Creates game state for a new game.
   *
   * The game begins with RED to move, status `RUNNING`, a move clock of
   * zero, and every player in the `NORMAL` state.
   */
  constructor() {
    for (const color of PLAYER_COLORS) {
      this.playerStates.set(color, [PlayerState.NORMAL]);
    }
  }

  /**
   * Returns the color whose turn is currently active.
   */
  public getCurrentPlayerColor(): Color {
    return this.currentPlayerColor;
  }

  /**
   * Returns the overall lifecycle status of the game.
   */
  public getStatus(): GameStatus {
    return this.status;
  }

  /**
   * Returns the most recently assigned state for a player.
   *
   * @param color - The player color to inspect.
   * @returns The latest player state, or `undefined` if the color has no
   * stored state entry.
   */
  public getPlayerState(color: Color): PlayerState | undefined {
    const states = this.playerStates.get(color);

    return states?.[states.length - 1];
  }

  /**
   * Returns all states currently stored for a player.
   *
   * The returned array is a copy and can be mutated without affecting the
   * game's internal state.
   *
   * @param color - The player color to inspect.
   */
  public getPlayerStates(color: Color): PlayerState[] {
    return [...(this.playerStates.get(color) ?? [])];
  }

  /**
   * Returns all player state collections.
   *
   * Both the returned map and each returned state array are copies, so
   * mutating them does not affect this `GameState`.
   */
  public getAllPlayerStates(): Map<Color, PlayerState[]> {
    return new Map(
      Array.from(this.playerStates.entries()).map(([color, states]) => [
        color,
        [...states]
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

  /**
   * Checks whether a player currently has a specific state in their state
   * collection.
   *
   * @param color - The player color to inspect.
   * @param state - The state to look for.
   */
  public hasPlayerState(color: Color, state: PlayerState): boolean {
    return this.playerStates.get(color)?.includes(state) ?? false;
  }

  /**
   * Increments the move clock by one.
   */
  public incrementMoveClock(): void {
    this.moveClock += 1;
  }

  /**
   * Resets the move clock to zero, normally after a capture or pawn move.
   */
  public resetMoveClock(): void {
    this.moveClock = 0;
  }

  /**
   * Sets the color whose turn is currently active.
   *
   * This method does not validate turn order or whether the selected player
   * is active; callers are responsible for enforcing those rules.
   *
   * @param color - The new current player color.
   */
  public setCurrentPlayerColor(color: Color): void {
    this.currentPlayerColor = color;
  }

  /**
   * Sets the overall lifecycle status of the game.
   *
   * @param status - The new game status.
   */
  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  /**
   * Adds or updates a state for a player while preserving state invariants.
   *
   * Normalization rules include:
   * - `NORMAL` removes `CHECK`.
   * - `CHECK` removes `NORMAL`.
   * - Terminal/forfeit states remove `NORMAL` and `CHECK`.
   * - Re-applying an existing state moves it to the end of the state list.
   *
   * Terminal and forfeit states are not mutually exclusive: for example, a
   * player may retain both `RESIGNED` and `CHECKMATE` if both conditions are
   * recorded during the game.
   *
   * @param color - The player color whose state should be updated.
   * @param state - The state to add or make current.
   */
  public setPlayerState(color: Color, state: PlayerState): void {
    const states = this.withNormalizedState(
      this.playerStates.get(color) ?? [],
      state
    );

    this.playerStates.set(color, states);
  }

  /**
   * Produces a normalized replacement state list after applying
   * `nextState`.
   */
  private withNormalizedState(
    currentStates: PlayerState[],
    nextState: PlayerState
  ): PlayerState[] {
    let states = currentStates.filter(state => state !== nextState);

    if (nextState === PlayerState.NORMAL) {
      states = states.filter(state => state !== PlayerState.CHECK);

      if (states.some(state => this.isTerminalOrForfeitState(state))) {
        return states;
      }
    }

    if (nextState === PlayerState.CHECK) {
      states = states.filter(state => state !== PlayerState.NORMAL);

      if (states.some(state => this.isTerminalOrForfeitState(state))) {
        return states;
      }
    }

    if (this.isTerminalOrForfeitState(nextState)) {
      states = states.filter(state =>
        state !== PlayerState.NORMAL &&
        state !== PlayerState.CHECK
      );
    }

    states.push(nextState);

    return states;
  }

  /**
   * Checks whether a state represents a terminal board condition or a
   * player forfeit condition.
   */
  private isTerminalOrForfeitState(state: PlayerState): boolean {
    return (
      state === PlayerState.CHECKMATE ||
      state === PlayerState.STALEMATE ||
      state === PlayerState.RESIGNED ||
      state === PlayerState.TIMED_OUT
    );
  }
}