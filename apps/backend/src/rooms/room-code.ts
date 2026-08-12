/**
 * Characters used to generate shareable room codes.
 *
 * Deliberately excludes visually ambiguous characters (`0`/`O`, `1`/`I`)
 * so a code read aloud or handwritten is never misread.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const CODE_LENGTH = 6;

/**
 * Generates a random, human-shareable room code (e.g. `"K7XPQ2"`).
 *
 * Does not itself guarantee uniqueness across existing rooms — see
 * {@link RoomManager.createRoom}, which regenerates on collision.
 */
export function generateRoomCode(): string {
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return code;
}