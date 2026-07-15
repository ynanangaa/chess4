import { Color, GameStatus } from '../types';
import { PlayerState } from '../types';

export class GameState {
  private status: GameStatus;
  private playerStates: Map<Color, PlayerState> 
    = new Map<Color, PlayerState>();

  constructor() {
    this.status = GameStatus.RUNNING;
    this.setPlayerState(Color.RED, PlayerState.NORMAL);
    this.setPlayerState(Color.BLUE, PlayerState.NORMAL);
    this.setPlayerState(Color.YELLOW, PlayerState.NORMAL);
    this.setPlayerState(Color.GREEN, PlayerState.NORMAL);
  }

  // Accessors
  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayerState(color: Color): PlayerState | undefined {
    return this.playerStates.get(color);
  }

  public getPlayerStates(): Map<Color, PlayerState> {
    return new Map(this.playerStates.entries());
  }

  // Mutators
  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  public setPlayerState(color: Color, state: PlayerState): void {
    this.playerStates.set(color, state);
  }
}