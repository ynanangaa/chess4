import {
  Color, DefaultRuleSet, Game, Move, MoveGenerator, inverseParseCol,
  parseSquareCoords,
} from '@chess4/engine';
import { PIECE_TYPE_ORDER, rotateCoords, rotationStepsFor, seatOrder } from './canonicalize';

const N = 14;
const PLANE_SIZE = N * N;
const NUM_PIECE_PLANES = 4 * PIECE_TYPE_ORDER.length; // 24
export const NUM_PLANES = NUM_PIECE_PLANES + 1;        // + validity plane

// Tunable normalization ceilings. MOVE_CLOCK_MAX/REPETITION_MAX are not
// arbitrary — they match DefaultRuleSet.isDrawBy50MovesRule (200) and
// RuleSet.isDrawByTripleRepetition (3) exactly, so a "close to 1" value
// here means what the actual rules mean by it.
export const SCORE_MAX = 150;
export const MOVE_CLOCK_MAX = 200;
export const REPETITION_MAX = 3;
export const MAX_CAPTURE_VALUE = 9; // queen — the highest Piece.points in play

export const GLOBAL_VECTOR_DIM = 4 + 20 + 8 + 1 + 1; // scores, status×5×4, castling×2×4, clock, repetition
export const MOVE_FEATURE_DIM = 4 + PIECE_TYPE_ORDER.length + 1 + 1 + 2 + 1 + 1;

export interface TrainingTensors {
  /** Flat, plane-major: index = planeIndex*196 + (row-1)*14 + (col-1). */
  planes: Float32Array;
  globalVector: Float32Array;
  /** Flat, one row of MOVE_FEATURE_DIM per legal move. */
  moveFeatures: Float32Array;
  moveCount: number;
  /** Row-parallel to moveFeatures — translates a chosen index back into a real move. */
  moveMeta: Array<{ pieceId: string; from: number; to: number }>;
}

/**
 * The rotation-invariant board-shape plane (see `canonicalize.ts`'s
 * class doc). Computed once from a throwaway `Game`'s public
 * `ReadonlyBoard.isValidSquare`, deliberately without importing
 * engine-internal helpers (e.g. `validBoardSquares`) — this package
 * stays on the same public-API-only footing as the frontend/backend.
 */
let cachedValidityPlane: Float32Array | undefined;

function getValidityPlane(): Float32Array {
  if (cachedValidityPlane) return cachedValidityPlane;

  const plane = new Float32Array(PLANE_SIZE);
  const board = new Game(new DefaultRuleSet(new MoveGenerator())).getBoard();

  for (let squareId = 0; squareId < PLANE_SIZE; squareId += 1) {
    if (!board.isValidSquare(squareId)) continue;
    const { row, col } = parseSquareCoords(squareId);
    plane[(row - 1) * N + (inverseParseCol(col) - 1)] = 1;
  }

  cachedValidityPlane = plane;
  return plane;
}

/**
 * Encodes `game`'s current position from `perspective`'s point of view.
 *
 * @param perspective - Must equal `game.getCurrentPlayerColor()`; moves
 * and planes are always encoded relative to whoever is actually to
 * move, per this project's relative-color design.
 */
export function buildTrainingTensors(game: Game, perspective: Color): TrainingTensors {
  const k = rotationStepsFor(perspective);
  const seats = seatOrder(perspective);
  const board = game.getBoard();

  // ── Spatial planes ──────────────────────────────────────────────
  const planes = new Float32Array(NUM_PLANES * PLANE_SIZE);
  planes.set(getValidityPlane(), NUM_PIECE_PLANES * PLANE_SIZE);

  for (const [squareId, pieceId] of board.getOccupiedSquares()) {
    const piece = board.getPiece(pieceId)!;
    const { row, col } = parseSquareCoords(squareId);
    const [r, c] = rotateCoords(row, inverseParseCol(col), k);

    const seat = seats.indexOf(piece.color);
    const typeIdx = PIECE_TYPE_ORDER.indexOf(piece.type);
    const planeIndex = seat * PIECE_TYPE_ORDER.length + typeIdx;
    const value = board.isPieceActive(pieceId) ? 1 : 0.5;

    planes[planeIndex * PLANE_SIZE + (r - 1) * N + (c - 1)] = value;
  }

  // ── Global vector ────────────────────────────────────────────────
  const globalVector = new Float32Array(GLOBAL_VECTOR_DIM);
  let g = 0;

  for (const color of seats) globalVector[g++] = game.getPlayer(color).getScore() / SCORE_MAX;

  for (const color of seats) {
    const s = game.getPlayerStatus(color);
    globalVector[g++] = s.inCheck ? 1 : 0;
    globalVector[g++] = s.checkmated ? 1 : 0;
    globalVector[g++] = s.stalemated ? 1 : 0;
    globalVector[g++] = s.resigned ? 1 : 0;
    globalVector[g++] = s.timedOut ? 1 : 0;
  }

  for (const color of seats) {
    const kingId = `K-${color}`;
    const kingMoved = game.hasPieceMoved(kingId);
    globalVector[g++] = !kingMoved && !game.hasPieceMoved(`R-${color}-kingside`) ? 1 : 0;
    globalVector[g++] = !kingMoved && !game.hasPieceMoved(`R-${color}-queenside`) ? 1 : 0;
  }

  globalVector[g++] = Math.min(game.getMoveClock() / MOVE_CLOCK_MAX, 1);
  globalVector[g++] = Math.min(game.getCurrentPositionCount() / REPETITION_MAX, 1);

  // ── Legal moves ──────────────────────────────────────────────────
  const legalMoves: Move[] = [];
  for (const piece of board.getPiecesByColor(perspective)) {
    legalMoves.push(...game.getLegalMoves(piece.id));
  }

  const moveFeatures = new Float32Array(legalMoves.length * MOVE_FEATURE_DIM);
  const moveMeta: Array<{ pieceId: string; from: number; to: number }> = [];

  legalMoves.forEach((move, i) => {
    let f = i * MOVE_FEATURE_DIM;
    const piece = board.getPiece(move.pieceId)!;
    const from = parseSquareCoords(move.from);
    const to = parseSquareCoords(move.to);
    const [fr, fc] = rotateCoords(from.row, inverseParseCol(from.col), k);
    const [tr, tc] = rotateCoords(to.row, inverseParseCol(to.col), k);

    moveFeatures[f++] = (fr - 1) / (N - 1);
    moveFeatures[f++] = (fc - 1) / (N - 1);
    moveFeatures[f++] = (tr - 1) / (N - 1);
    moveFeatures[f++] = (tc - 1) / (N - 1);

    for (const type of PIECE_TYPE_ORDER) moveFeatures[f++] = type === piece.type ? 1 : 0;

    const capturedPiece = move.capture ? board.getPiece(move.capture) : undefined;
    moveFeatures[f++] = move.capture ? 1 : 0;
    moveFeatures[f++] = capturedPiece?.points ? capturedPiece.points / MAX_CAPTURE_VALUE : 0;

    moveFeatures[f++] = move.castle === 'kingside' ? 1 : 0;
    moveFeatures[f++] = move.castle === 'queenside' ? 1 : 0;
    moveFeatures[f++] = move.pawnSpecialMove === 'doublestep' ? 1 : 0;
    moveFeatures[f++] = move.pawnSpecialMove === 'promotion' ? 1 : 0;

    moveMeta.push({ pieceId: move.pieceId, from: move.from, to: move.to });
  });

  return { planes, globalVector, moveFeatures, moveCount: legalMoves.length, moveMeta };
}