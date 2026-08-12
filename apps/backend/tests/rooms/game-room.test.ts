import { describe, expect, test } from '@jest/globals';
import { Color } from '@chess4/engine';
import { GameRoom } from '../../src/rooms/game-room';

describe('GameRoom', () => {
  test('assigns seats in canonical color order', () => {
    const room = new GameRoom('TEST01');

    expect(room.assignSeat()).toBe(Color.RED);
    expect(room.assignSeat()).toBe(Color.BLUE);
    expect(room.assignSeat()).toBe(Color.YELLOW);
    expect(room.assignSeat()).toBe(Color.GREEN);
  });

  test('returns undefined once every seat is taken', () => {
    const room = new GameRoom('TEST02');

    for (let i = 0; i < 4; i += 1) room.assignSeat();

    expect(room.assignSeat()).toBeUndefined();
    expect(room.isFull()).toBe(true);
  });

  test('releasing a seat makes it assignable again', () => {
    const room = new GameRoom('TEST03');

    for (let i = 0; i < 4; i += 1) room.assignSeat();
    room.releaseSeat(Color.BLUE);

    expect(room.isFull()).toBe(false);
    expect(room.assignSeat()).toBe(Color.BLUE);
  });

  test('exposes a working Game instance', () => {
    const room = new GameRoom('TEST04');

    expect(room.getGame().isOver()).toBe(false);
  });

  test('has not started until the fourth seat is filled', () => {
    const room = new GameRoom('TEST05');

    room.assignSeat();
    room.assignSeat();
    room.assignSeat();
    expect(room.hasStarted()).toBe(false);

    room.assignSeat();
    expect(room.hasStarted()).toBe(true);
  });

  test('disconnect before start releases the seat', () => {
    const room = new GameRoom('TEST06');
    room.assignSeat(); // RED

    room.handleDisconnect(Color.RED);

    expect(room.isSeatTaken(Color.RED)).toBe(false);
    expect(room.hasStarted()).toBe(false);
  });

  test('disconnect after start resigns the player and keeps the seat', () => {
    const room = new GameRoom('TEST07');
    for (let i = 0; i < 4; i += 1) room.assignSeat();

    room.handleDisconnect(Color.RED);

    expect(room.isSeatTaken(Color.RED)).toBe(true);
    expect(room.getGame().isPlayerResignedOrTimedOut(Color.RED)).toBe(true);
  });

  test('a second disconnect for an already-resigned player is a no-op', () => {
    const room = new GameRoom('TEST08');
    for (let i = 0; i < 4; i += 1) room.assignSeat();

    room.handleDisconnect(Color.RED);
    expect(() => room.handleDisconnect(Color.RED)).not.toThrow();
  });
});