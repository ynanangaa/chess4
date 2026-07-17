import { Color, GameStatus, PlayerState } from "../types";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export class GameState {
  private status: GameStatus = GameStatus.RUNNING;
  private playerStates = new Map<Color, PlayerState>();

  constructor() {
    for (const color of PLAYER_COLORS) {
      this.setPlayerState(color, PlayerState.NORMAL);
    }
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayerState(color: Color): PlayerState | undefined {
    return this.playerStates.get(color);
  }

  public getPlayerStates(): Map<Color, PlayerState> {
    return new Map(this.playerStates);
  }

  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  public setPlayerState(color: Color, state: PlayerState): void {
    this.playerStates.set(color, state);
  }
}
