import { useSyncExternalStore } from 'react';
import { GameService, gameService } from './game-service';

/**
 * Subscribes the calling component to `gameService`, re-rendering it
 * whenever a move, resignation, timeout, victory claim, or new game is
 * processed through the service.
 *
 * Components should call `gameService`'s query methods directly in
 * their render body to read state — this hook exists solely to give
 * React a change signal to schedule re-renders on; its return value is
 * `gameService` itself, purely for call-site convenience.
 */
export function useGameService(): GameService {
  useSyncExternalStore(gameService.subscribe, gameService.getSnapshot);
  return gameService;
}