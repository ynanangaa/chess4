import { useSyncExternalStore } from 'react';
import { type GameService } from './game-service';

/**
 * Subscribes the calling component to the provided GameService implementation
 * (either the local `gameService` or `networkGameService`), re-rendering
 * whenever that service signals a state change.
 */
export function useGameService(service: GameService): GameService {
  useSyncExternalStore(service.subscribe, service.getSnapshot);
  return service;
}