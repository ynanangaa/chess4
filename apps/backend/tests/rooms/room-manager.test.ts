import { describe, expect, test } from '@jest/globals';
import { RoomManager } from '../../src/rooms/room-manager';

describe('RoomManager', () => {
  test('creates a room with a lookup-able code', () => {
    const manager = new RoomManager();
    const room = manager.createRoom();

    expect(manager.getRoom(room.code)).toBe(room);
  });

  test('looks up rooms case-insensitively', () => {
    const manager = new RoomManager();
    const room = manager.createRoom();

    expect(manager.getRoom(room.code.toLowerCase())).toBe(room);
  });

  test('returns undefined for an unknown code', () => {
    const manager = new RoomManager();

    expect(manager.getRoom('NOPE01')).toBeUndefined();
  });

  test('removeRoom drops the room', () => {
    const manager = new RoomManager();
    const room = manager.createRoom();

    manager.removeRoom(room.code);

    expect(manager.getRoom(room.code)).toBeUndefined();
  });
});