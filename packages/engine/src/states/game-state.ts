import { GameStatus } from '../game/game-status';
import { PlayerColor } from '../players/player-color';
import { PlayerState } from './player-state';

export class GameState {
  private status: GameStatus;
  private playerStates: Map<PlayerColor, PlayerState> 
    = new Map<PlayerColor, PlayerState>();

  constructor() {
    this.status = GameStatus.RUNNING;
    this.setPlayerState(PlayerColor.RED, PlayerState.NORMAL);
    this.setPlayerState(PlayerColor.BLUE, PlayerState.NORMAL);
    this.setPlayerState(PlayerColor.YELLOW, PlayerState.NORMAL);
    this.setPlayerState(PlayerColor.GREEN, PlayerState.NORMAL);
  }

  // Accessors
  public getStatus(): GameStatus {
    return this.status;
  }

  public getPlayerState(color: PlayerColor): PlayerState | undefined {
    return this.playerStates.get(color);
  }

  // Mutators
  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  public setPlayerState(color: PlayerColor, state: PlayerState): void {
    this.playerStates.set(color, state);
  }
}