import { randomUUID } from 'node:crypto';
import { DefaultRuleSet, Game, MoveGenerator } from '@chess4/engine';

/**
 * Owns every currently active training `Game`, keyed by a generated id.
 *
 * Purpose-built for self-play: games are created headlessly in bulk,
 * with no seat assignment — a single caller (the Python training
 * process) is expected to control all four colors of every game it
 * owns, unlike `apps/backend`'s `RoomManager`/`GameRoom`, which assign
 * one human-controlled seat at a time.
 */
export class GameRegistry {
  private games = new Map<string, Game>();

  /** Creates and registers a fresh game, returning its new id. */
  public createGame(): string {
    const id = randomUUID();
    this.games.set(id, new Game(new DefaultRuleSet(new MoveGenerator())));
    return id;
  }

  public getGame(id: string): Game | undefined {
    return this.games.get(id);
  }

  /**
   * Discards and recreates a game in place, keeping the same id.
   *
   * Prefer this over delete+create between self-play episodes: it
   * avoids id churn on the Python side, which can hold a fixed pool of
   * environment slots for the lifetime of a training run instead of
   * having to track newly-minted ids after every episode boundary.
   *
   * @returns `false` if `id` isn't currently registered (no-op).
   */
  public resetGame(id: string): boolean {
    if (!this.games.has(id)) return false;

    this.games.set(id, new Game(new DefaultRuleSet(new MoveGenerator())));
    return true;
  }

  public removeGame(id: string): boolean {
    return this.games.delete(id);
  }

  public getGameCount(): number {
    return this.games.size;
  }
}