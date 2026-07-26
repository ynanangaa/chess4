import { Board } from "../board";
import { Col, Color, Piece, PieceType, Row, SquareCoords, SquareCoordsOffset } from "../types";

/** The board dimension: 14 rows × 14 columns. */
const BOARD_SIZE = 14;

/** Smallest valid row and column number on the board. */
const FIRST_VALID_SQUARE = 1;

/** Largest valid row and column number on the board. */
const LAST_VALID_SQUARE = BOARD_SIZE;

/** Canonical order used when iterating both flanks: kingside, then queenside. */
const PLAYER_SIDES = [true, false];

// ─── Coordinate parsing (public) ──────────────────────────────────────────

/**
 * Converts a (row, column) pair into a flat square id.
 *
 * ids are computed as `14·(col − 1) + (row − 1)`, i.e. column-major order
 * over a 14×14 grid.
 *
 * @param row - Row number, from 1 to 14.
 * @param col - Column number, from 1 to 14.
 * @returns The corresponding flat square id.
 */
export function parseSquareId(row: number, col: number): number {
  return BOARD_SIZE * (col - 1) + row - 1;
}

/**
 * Converts a column number (1–14) into its algebraic notation letter
 * (`a`–`n`).
 *
 * @param col - The column number to convert.
 */
export function parseCol(col: number): Col {
  return String.fromCharCode(96 + col) as Col;
}

/**
 * Converts a column letter (`a`–`n`) back into its column number (1–14).
 *
 * @param col - The column letter to convert.
 */
export function inverseParseCol(col: Col): number {
  return col.charCodeAt(0) - 96;
}

/**
 * Coerces a raw number into the `Row` type.
 *
 * @param row - The row number to coerce.
 */
export function parseRow(row: number): Row {
  return row as Row;
}

/**
 * Converts a flat square id into a `{row, col}` coordinate object.
 *
 * @param id - The flat square id to convert.
 * @see parseSquareId
 * @see toSquareId
 */
export function parseSquareCoords(id: number): SquareCoords {
  return {
    row: parseRow(id % BOARD_SIZE + 1),
    col: parseCol(Math.trunc(id / BOARD_SIZE) + 1)
  };
}

/**
 * Converts a `{row, col}` coordinate object back into a flat square id.
 *
 * @param coords - The coordinates to convert.
 * @see parseSquareId
 * @see parseSquareCoords
 */
export function toSquareId(coords: SquareCoords): number {
  return parseSquareId(coords.row, inverseParseCol(coords.col));
}

/**
 * Applies a row/column offset to a set of coordinates, returning the
 * resulting coordinates or `undefined` if the result falls outside the
 * board's 1–14 bounds.
 *
 * Used internally by sliding-piece and step-piece move generation to
 * probe adjacent or successive squares.
 *
 * @param coords - The starting coordinates.
 * @param offset - The row and column delta to apply.
 * @returns The translated coordinates, or `undefined` if out of bounds.
 */
export function translateSquareCoords(
  coords: SquareCoords,
  offset: SquareCoordsOffset
): SquareCoords | undefined {
  const row = coords.row + offset.rowDelta;
  const col = inverseParseCol(coords.col) + offset.colDelta;

  if (
    row < FIRST_VALID_SQUARE ||
    row > LAST_VALID_SQUARE ||
    col < FIRST_VALID_SQUARE ||
    col > LAST_VALID_SQUARE
  ) {
    return undefined;
  }

  return {
    row: parseRow(row),
    col: parseCol(col)
  };
}

// ─── Board shape (internal) ────────────────────────────────────────────────

/**
 * Computes the set of valid square ids forming the four-player cross-shaped
 * board (14×14 grid with the four 3×3 corners removed).
 *
 * @remarks Internal — used by {@link Board} to validate square ids. Not
 * part of the public API, since board shape is currently fixed rather than
 * configurable.
 */
export function validBoardSquares(): Set<number> {
  const validSquares = new Set<number>();

  addSquareRange(validSquares, 4, 11, 1, 3);
  addSquareRange(validSquares, 1, 14, 4, 11);
  addSquareRange(validSquares, 4, 11, 12, 14);

  return validSquares;
}

/**
 * Adds every square id in the given row/column rectangle to `squares`.
 *
 * @remarks Internal helper for {@link validBoardSquares}.
 */
function addSquareRange(
  squares: Set<number>,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): void {
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      squares.add(parseSquareId(row, col));
    }
  }
}

// ─── Equality helpers (internal) ──────────────────────────────────────────

/**
 * Checks whether two coordinate objects refer to the same square.
 *
 * @remarks Internal — not currently used across public-facing workflows.
 */
export function areSameCoords(
  left: SquareCoords | undefined,
  right: SquareCoords | undefined
): boolean {
  return !!left && !!right && left.col === right.col && left.row === right.row;
}

/**
 * Checks whether two pieces represent the same piece (matching id, type,
 * and color).
 *
 * @remarks Internal — not currently used across public-facing workflows.
 */
export function isSamePiece(left: Piece | undefined, right: Piece | undefined): boolean {
  return (
    !!left &&
    !!right &&
    left.id === right.id &&
    left.type === right.type &&
    left.color === right.color
  );
}

// ─── Standard piece id conventions (internal) ─────────────────────────────

/**
 * Constructs the stable id string used by the engine's standard piece set.
 *
 * Id format:
 * - Pawns: `"{color}-{pawnNum}"` (e.g. `"red-1"`)
 * - All other pieces: `"{PieceType}-{color}"` (e.g. `"Q-red"`, `"K-red"`)
 *
 * @remarks
 * Internal — this convention is used throughout the engine (e.g.
 * `RuleSet`/`Board` look up a king via `` `K-${color}` ``). If you build
 * fully custom `Piece` objects, you are free to use any id scheme you
 * like, **except** for pieces the engine specifically expects to find by
 * a conventional id (kings and castling rooks) — see the project README
 * for the exact conventions the engine depends on.
 *
 * @param color - The piece's color.
 * @param type - The piece's type.
 * @param pawnNum - Pawn number (1–8). Required only when creating pawns.
 */
export function createPieceId(color: Color, type: PieceType, pawnNum?: number): string {
  if (type === PieceType.PAWN && pawnNum !== undefined) {
    return `${color}-${pawnNum}`;
  }

  return `${type}-${color}`;
}

/**
 * Constructs the stable id string used by the engine's standard "duplicate"
 * pieces (rook, bishop, or knight — two copies per player per type).
 *
 * Id format: `"{type}-{color}-{side}"`, where `side` is either
 * `"kingside"` or `"queenside"`.
 *
 * @remarks
 * Internal — castling specifically depends on rooks being identifiable as
 * `` `R-${color}-kingside` `` / `` `R-${color}-queenside` ``. See the
 * project README for details if implementing custom rook ids.
 *
 * @param color - The piece's color.
 * @param type - The piece's type (rook, bishop, or knight).
 * @param kingSide - `true` for the kingside copy, `false` for queenside.
 */
export function createDuplicatePieceId(
  color: Color,
  type: PieceType,
  kingSide: boolean
): string {
  return `${type}-${color}-${kingSide ? "kingside" : "queenside"}`;
}

// ─── Standard piece builders (internal) ───────────────────────────────────

/**
 * Builds a pawn `Piece` in its default active state, using the engine's
 * standard id convention.
 *
 * @remarks Internal — used to assemble the standard starting setup. Build
 * your own `Piece` objects directly for custom setups.
 */
export function buildPawn(color: Color, pawnNum: number): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.PAWN, pawnNum),
    color,
    type: PieceType.PAWN,
    points: 1
  };
}

/**
 * Builds a queen `Piece` in its default active state, using the engine's
 * standard id convention.
 *
 * @remarks Internal — used to assemble the standard starting setup.
 */
export function buildQueen(color: Color): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.QUEEN),
    color,
    type: PieceType.QUEEN,
    points: 9
  };
}

/**
 * Builds a king `Piece` in its default active state, using the engine's
 * standard id convention.
 *
 * @remarks
 * Internal — used to assemble the standard starting setup. Note that the
 * engine specifically looks up a player's king via `` `K-${color}` ``
 * (see e.g. `Board.setPlayerPiecesInactive`), so a custom king piece must
 * use this same id format to remain compatible with the standard rule set.
 */
export function buildKing(color: Color): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.KING),
    color,
    type: PieceType.KING
  };
}

/**
 * Builds a "duplicate" piece (rook, bishop, or knight) in its default
 * active state, using the engine's standard id convention.
 *
 * Points are assigned automatically: 3 for knights, 5 for bishops and
 * rooks (per this project's four-player point valuation).
 *
 * @remarks
 * Internal — used to assemble the standard starting setup. Note castling
 * rooks are specifically looked up via
 * `` `R-${color}-kingside` ``/`` `R-${color}-queenside` `` (see
 * `DefaultRuleSet.getCastleMoves`), so custom rooks intended to castle
 * must follow this id format.
 *
 * @param color - The piece's color.
 * @param type - Must be `ROOK`, `BISHOP`, or `KNIGHT`.
 * @param kingSide - `true` for the kingside copy, `false` for queenside.
 */
export function buildDuplicatePiece(
  color: Color,
  type: PieceType,
  kingSide: boolean
): Piece {
  const points = type === PieceType.KNIGHT? 3: 5;
  return {
    active: true,
    id: createDuplicatePieceId(color, type, kingSide),
    color,
    type,
    points: points
  };
}

// ─── Standard initial position lookups (internal) ─────────────────────────

/**
 * Returns the standard initial square id for a pawn.
 *
 * @remarks
 * Internal — encodes the hardcoded standard four-player starting layout,
 * used only to assemble the default board setup. For a custom starting
 * position, supply your own `[pieces, squareIds]` tuple to the
 * `Game`/`Board` constructor instead of relying on this function.
 */
export function pawnInitialSquareId(color: Color, pawnNum: number): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(2, 3 + pawnNum);
    case Color.YELLOW:
      return parseSquareId(13, 12 - pawnNum);
    case Color.BLUE:
      return parseSquareId(12 - pawnNum, 2);
    case Color.GREEN:
      return parseSquareId(3 + pawnNum, 13);
  }
}

/**
 * Returns the standard initial square id for a bishop.
 *
 * @remarks Internal — see {@link pawnInitialSquareId} for the general note
 * on custom starting positions.
 */
export function bishopInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 9 : 6);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 6 : 9);
    case Color.BLUE:
      // BLUE's own left/right axis runs along decreasing row (see
      // kingInitialSquareId/queenInitialSquareId below), so the flank
      // adjacent to the king (kingside) is on the LOWER row side.
      return parseSquareId(kingSide ? 6 : 9, 1);
    case Color.GREEN:
      // GREEN's own left/right axis runs along increasing row, so the
      // flank adjacent to the king (kingside) is on the HIGHER row side.
      return parseSquareId(kingSide ? 9 : 6, 14);
  }
}

/**
 * Returns the standard initial square id for a knight.
 *
 * @remarks Internal — see {@link pawnInitialSquareId} for the general note
 * on custom starting positions.
 */
export function knightInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 10 : 5);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 5 : 10);
    case Color.BLUE:
      return parseSquareId(kingSide ? 5 : 10, 1);
    case Color.GREEN:
      return parseSquareId(kingSide ? 10 : 5, 14);
  }
}

/**
 * Returns the standard initial square id for a rook.
 *
 * @remarks Internal — see {@link pawnInitialSquareId} for the general note
 * on custom starting positions.
 */
export function rookInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 11 : 4);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 4 : 11);
    case Color.BLUE:
      return parseSquareId(kingSide ? 4 : 11, 1);
    case Color.GREEN:
      return parseSquareId(kingSide ? 11 : 4, 14);
  }
}

/**
 * Returns the standard initial square id for the queen.
 *
 * @remarks Internal — see {@link pawnInitialSquareId} for the general note
 * on custom starting positions.
 */
export function queenInitialSquareId(color: Color): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, 7);
    case Color.YELLOW:
      return parseSquareId(14, 8);
    case Color.BLUE:
      // From BLUE's own point of view (facing right, toward increasing
      // column), "left of the king" is the higher-row side.
      return parseSquareId(8, 1);
    case Color.GREEN:
      // From GREEN's own point of view (facing left, toward decreasing
      // column), "left of the king" is the lower-row side.
      return parseSquareId(7, 14);
  }
}

/**
 * Returns the standard initial square id for the king.
 *
 * @remarks
 * Internal — see {@link pawnInitialSquareId} for the general note on
 * custom starting positions. Also relied upon by castling logic
 * (`DefaultRuleSet.getCastleMoves`) to check whether a king still sits on
 * its starting square.
 */
export function kingInitialSquareId(color: Color): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, 8);
    case Color.YELLOW:
      return parseSquareId(14, 7);
    case Color.BLUE:
      return parseSquareId(7, 1);
    case Color.GREEN:
      return parseSquareId(8, 14);
  }
}

/**
 * Builds all pieces and their standard initial square ids for a single
 * color, in standard four-player starting order: 8 pawns, then rooks,
 * bishops, knights (kingside then queenside), queen, king.
 *
 * @remarks
 * Internal — this is exactly what {@link Board}'s default (no-argument)
 * constructor uses to set up a standard game. For a custom starting
 * position, construct your own `Piece` objects and pass a
 * `[pieces, squareIds]` tuple to `Board`/`Game` directly instead.
 *
 * @param color - The color to build pieces for.
 * @returns A tuple `[pieces, squareIds]`.
 */
export function initializePieces(color: Color): [Piece[], number[]] {
  const pieces: Piece[] = [];
  const initialSquareIds: number[] = [];

  for (let pawnNum = 1; pawnNum <= 8; pawnNum += 1) {
    pieces.push(buildPawn(color, pawnNum));
    initialSquareIds.push(pawnInitialSquareId(color, pawnNum));
  }

  for (const kingSide of PLAYER_SIDES) {
    pieces.push(buildDuplicatePiece(color, PieceType.ROOK, kingSide));
    initialSquareIds.push(rookInitialSquareId(color, kingSide));

    pieces.push(buildDuplicatePiece(color, PieceType.BISHOP, kingSide));
    initialSquareIds.push(bishopInitialSquareId(color, kingSide));

    pieces.push(buildDuplicatePiece(color, PieceType.KNIGHT, kingSide));
    initialSquareIds.push(knightInitialSquareId(color, kingSide));
  }

  pieces.push(buildQueen(color));
  initialSquareIds.push(queenInitialSquareId(color));

  pieces.push(buildKing(color));
  initialSquareIds.push(kingInitialSquareId(color));

  return [pieces, initialSquareIds];
}

// ─── Misc internal helpers ─────────────────────────────────────────────────

/**
 * Picks a uniformly random element from an array.
 *
 * @remarks Internal — used by `DefaultRuleSet` to auto-play a random king
 * move for resigned/timed-out players.
 */
export function pickRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Appends `enemyPosition` to `moves` only if it is occupied by a piece of
 * a different color than `piece`.
 *
 * @remarks Internal — used by pawn move generation for diagonal captures.
 */
export function pushIfOccupantIsEnemy(
  moves: number[],
  piece: Piece,
  board: Board,
  enemyPosition: number
): void {
  const occupant = board.getPieceAt(enemyPosition);

  if (occupant && occupant.color !== piece.color) {
    moves.push(enemyPosition);
  }
}

/**
 * Appends `targetPosition` to `moves` if it is empty or occupied by a
 * piece of a different color than `piece`.
 *
 * @remarks Internal — used by step-piece move generation (knight, king).
 */
export function pushIfEmptyOrEnemy(
  moves: number[],
  piece: Piece,
  board: Board,
  targetPosition: number
): void {
  const occupant = board.getPieceAt(targetPosition);

  if (!occupant || occupant.color !== piece.color) {
    moves.push(targetPosition);
  }
}

/**
 * Computes pseudo-legal destination squares for a sliding piece (rook,
 * bishop, queen) by walking each direction in `offsets` one step at a
 * time until an occupied square or the board edge is reached.
 *
 * @remarks Internal — shared implementation behind `rookMoves`,
 * `bishopMoves`, and `queenMoves`.
 *
 * @param pieceId - The id of the sliding piece.
 * @param board - The board to evaluate against.
 * @param offsets - The direction(s) to slide along.
 * @returns All reachable square ids, including a capture square where a
 * ray is stopped by an enemy piece.
 */
export function slidingMoves(
  pieceId: string,
  board: Board,
  offsets: SquareCoordsOffset[]
): number[] {
  const moves: number[] = [];
  const piecePosition = board.getPositionOf(pieceId);
  if (piecePosition === undefined) return moves;

  const piece = board.getPiece(pieceId);
  if (!piece) return moves;

  for (const offset of offsets) {
    let currentCoords = parseSquareCoords(piecePosition);

    while (true) {
      const translated = translateSquareCoords(currentCoords, offset);
      if (!translated) break;

      const newPosition = toSquareId(translated);
      if (!board.isValidSquare(newPosition)) break;

      const occupant = board.getPieceAt(newPosition);
      if (occupant) {
        if (occupant.color !== piece.color) {
          moves.push(newPosition);
        }
        break;
      }

      moves.push(newPosition);
      currentCoords = translated;
    }
  }

  return moves;
}