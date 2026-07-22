import { Color, GameStatus, PlayerState } from "../types";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export class GameState {
  private currentPlayerColor: Color = Color.RED;
  private status: GameStatus = GameStatus.RUNNING;
  private playerStates = new Map<Color, PlayerState[]>();
  private moveClock = 0;

  constructor() {
    for (const color of PLAYER_COLORS) {
      this.playerStates.set(color, [PlayerState.NORMAL]);
    }
  }

  public getCurrentPlayerColor(): Color {
    return this.currentPlayerColor;
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayerState(color: Color): PlayerState | undefined {
    const states = this.playerStates.get(color);

    return states?.[states.length - 1];
  }

  public getPlayerStates(color: Color): PlayerState[] {
    return [...(this.playerStates.get(color) ?? [])];
  }

  public getAllPlayerStates(): Map<Color, PlayerState[]> {
    return new Map(
      Array.from(this.playerStates.entries()).map(([color, states]) => [
        color,
        [...states]
      ])
    );
  }

  public getMoveClock(): number {
    return this.moveClock;
  }

  public hasPlayerState(color: Color, state: PlayerState): boolean {
    return this.playerStates.get(color)?.includes(state) ?? false;
  }

  public incrementMoveClock(): void {
    this.moveClock += 1;
  }

  public resetMoveClock(): void {
    this.moveClock = 0;
  }

  public setCurrentPlayerColor(color: Color): void {
    this.currentPlayerColor = color;
  }

  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  public setPlayerState(color: Color, state: PlayerState): void {
    const states = this.withNormalizedState(
      this.playerStates.get(color) ?? [],
      state
    );

    this.playerStates.set(color, states);
  }

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

  private isTerminalOrForfeitState(state: PlayerState): boolean {
    return (
      state === PlayerState.CHECKMATE ||
      state === PlayerState.STALEMATE ||
      state === PlayerState.RESIGNED ||
      state === PlayerState.TIMED_OUT
    );
  }
}
