/**
 * Coordinate conversion utilities.
 *
 * These are useful independently of any specific board setup — e.g. for
 * a UI layer translating between rendered grid positions and the
 * engine's flat square ids.
 */
export {
  parseSquareId,
  parseSquareCoords,
  toSquareId,
  parseCol,
  parseRow,
  inverseParseCol,
  translateSquareCoords
} from './utils';