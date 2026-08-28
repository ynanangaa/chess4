import type { Color, PlayerStatus } from '@chess4/engine';

/**
 * Per-game entry in a `state` frame's header: identifying/status data
 * plus float32-element offsets locating that game's tensors within the
 * frame's trailing binary payload (see {@link packStateFrame}).
 *
 * A game that has just ended carries no tensors at all — every offset
 * is `-1` and `moveCount` is `0`, since there is nothing left to act on
 * and nothing was encoded for it this frame.
 */
export interface StateHeaderGame {
  gameId: string;
  /**
   * The color whose turn it is to act next, and the perspective the
   * accompanying tensors (if any) were encoded from. Meaningless when
   * `isOver` is `true`.
   */
  currentPlayer: Color;
  isOver: boolean;
  scores: Record<Color, number>;
  /**
   * Each color's real status flags at this point in the game (see
   * `PlayerStatus`) — added specifically so a consumer can distinguish
   * *how* a game ended (checkmate/stalemate/resignation/timeout) from
   * merely reading final scores, which alone can't tell "won by mating
   * three opponents" apart from "was ahead on points when the game
   * happened to end."
   */
  statuses: Record<Color, PlayerStatus>;
  moveCount: number;
  /**
   * Parallel to `moveFeatures`' rows: `moveMeta[i]` is the real move to
   * send back to `step` if the policy selects row `i`.
   */
  moveMeta: Array<{ pieceId: string; from: number; to: number }>;
  planesOffset: number;
  globalVectorOffset: number;
  moveFeaturesOffset: number;
}

/** The JSON header prefixing every binary `state` frame. */
export interface StateHeader {
  type: 'state';
  games: StateHeaderGame[];
}

/**
 * Packs a `state` frame: a 4-byte little-endian header length, followed
 * by the UTF-8 JSON header itself, followed by every game's tensors
 * concatenated back-to-back as raw float32 bytes.
 *
 * This lets a client read the bulk numeric payload with a single
 * zero-copy typed-array view (e.g. `np.frombuffer` on the Python side)
 * instead of paying JSON parsing cost for the actual tensor data —
 * only the small per-game metadata in `header` goes through JSON.
 *
 * @param buffers - Every game's tensors, in the exact order their
 * offsets in `header` were computed against.
 */
export function packStateFrame(header: StateHeader, buffers: Float32Array[]): Buffer {
  const headerJson = Buffer.from(JSON.stringify(header), 'utf8');

  const lengthPrefix = Buffer.alloc(4);
  lengthPrefix.writeUInt32LE(headerJson.length, 0);

  const payload = Buffer.concat(
    buffers.map(b => Buffer.from(b.buffer, b.byteOffset, b.byteLength))
  );

  return Buffer.concat([lengthPrefix, headerJson, payload]);
}