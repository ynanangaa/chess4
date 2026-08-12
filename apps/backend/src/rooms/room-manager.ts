import { GameRoom } from './game-room';
import { generateRoomCode } from './room-code';

/**
 * Owns every currently active {@link GameRoom}, keyed by its shareable
 * room code.
 *
 * Purely in-memory for now — rooms disappear on server restart. Swapping
 * in persistence later (e.g. for post-game statistics) only requires
 * changing this class's storage, not any caller of it.
 */
export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  /** Creates a new room with a freshly generated, guaranteed-unique code. */
  public createRoom(): GameRoom {
    let code = generateRoomCode();

    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const room = new GameRoom(code);
    this.rooms.set(code, room);

    return room;
  }

  /** Looks up a room by code, case-insensitively. */
  public getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /** Removes a room, e.g. once its game has ended and clients have left. */
  public removeRoom(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }
}