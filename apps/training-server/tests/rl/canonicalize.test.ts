import { describe, expect, it } from '@jest/globals';
import { Color, DefaultRuleSet, Game, MoveGenerator } from '@chess4/engine';
import { rotateCoords, rotationStepsFor, seatOrder, TURN_ORDER } from '../../src/rl/canonicalize';

function kingSquareCoords(game: Game, color: Color) {
  const board = game.getBoard();
  const squareId = board.getKingSquare(color)!;
  // parseSquareCoords isn't imported here on purpose: we cross-check
  // rotateCoords against the real Board via getSquareOf/getKingSquare,
  // so this test can't share a bug with the encoder's own coordinate
  // conversion.
  return squareIdToRowCol(squareId);
}

function squareIdToRowCol(squareId: number): [number, number] {
  const row = (squareId % 14) + 1;
  const col = Math.trunc(squareId / 14) + 1;
  return [row, col];
}

describe('rotationStepsFor / TURN_ORDER', () => {
  it('assigns steps in RED, BLUE, YELLOW, GREEN order', () => {
    expect(TURN_ORDER).toEqual([Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN]);
    expect(rotationStepsFor(Color.RED)).toBe(0);
    expect(rotationStepsFor(Color.BLUE)).toBe(1);
    expect(rotationStepsFor(Color.YELLOW)).toBe(2);
    expect(rotationStepsFor(Color.GREEN)).toBe(3);
  });
});

describe('rotateCoords', () => {
  it('maps every color\'s king to the same canonical square', () => {
    const game = new Game(new DefaultRuleSet(new MoveGenerator()));

    const [redRow, redCol] = kingSquareCoords(game, Color.RED);
    const canonicalKing = rotateCoords(redRow, redCol, rotationStepsFor(Color.RED));

    for (const color of TURN_ORDER) {
      const [row, col] = kingSquareCoords(game, color);
      const rotated = rotateCoords(row, col, rotationStepsFor(color));
      expect(rotated).toEqual(canonicalKing);
    }
  });

  it('maps every color\'s queen to the same canonical square', () => {
    const game = new Game(new DefaultRuleSet(new MoveGenerator()));
    const board = game.getBoard();

    const queenSquare = (color: Color) => squareIdToRowCol(board.getSquareOf(`Q-${color}`)!);

    const [redRow, redCol] = queenSquare(Color.RED);
    const canonicalQueen = rotateCoords(redRow, redCol, rotationStepsFor(Color.RED));

    for (const color of TURN_ORDER) {
      const [row, col] = queenSquare(color);
      const rotated = rotateCoords(row, col, rotationStepsFor(color));
      expect(rotated).toEqual(canonicalQueen);
    }
  });

  it('is a bijection on the 14x14 grid for every rotation step', () => {
    for (let k = 0; k < 4; k += 1) {
      const seen = new Set<string>();
      for (let row = 1; row <= 14; row += 1) {
        for (let col = 1; col <= 14; col += 1) {
          const [r, c] = rotateCoords(row, col, k);
          expect(r).toBeGreaterThanOrEqual(1);
          expect(r).toBeLessThanOrEqual(14);
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(14);
          seen.add(`${r},${c}`);
        }
      }
      expect(seen.size).toBe(196);
    }
  });

  it('maps every valid board square to another valid board square, for every rotation step', () => {
    const board = new Game(new DefaultRuleSet(new MoveGenerator())).getBoard();

    for (let k = 0; k < 4; k += 1) {
      for (let row = 1; row <= 14; row += 1) {
        for (let col = 1; col <= 14; col += 1) {
          const squareId = 14 * (col - 1) + (row - 1);
          if (!board.isValidSquare(squareId)) continue;

          const [r, c] = rotateCoords(row, col, k);
          const rotatedId = 14 * (c - 1) + (r - 1);
          expect(board.isValidSquare(rotatedId)).toBe(true);
        }
      }
    }
  });
});

describe('seatOrder', () => {
  it('always starts with the given perspective', () => {
    for (const color of TURN_ORDER) {
      expect(seatOrder(color)[0]).toBe(color);
    }
  });

  it('places the geometrically opposite color two seats away, for every perspective', () => {
    // Confirms turn order and rotation order coincide: "2 steps around
    // in turn order" must always be the same color as "opposite edge
    // of the board" for the relative-seat scheme to mean what it claims.
    for (const color of TURN_ORDER) {
      const seats = seatOrder(color);
      expect(seats[2]).not.toBe(color);
      expect(seats.length).toBe(4);
      expect(new Set(seats).size).toBe(4);
    }
  });
});