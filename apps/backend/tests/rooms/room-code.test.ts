import { describe, expect, test } from '@jest/globals';
import { generateRoomCode } from '../../src/rooms/room-code';

describe('generateRoomCode', () => {
  test('generates a 6-character code', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  test('never includes visually ambiguous characters', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateRoomCode()).not.toMatch(/[01OI]/);
    }
  });

  test('generates varied codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateRoomCode));

    expect(codes.size).toBeGreaterThan(90);
  });
});