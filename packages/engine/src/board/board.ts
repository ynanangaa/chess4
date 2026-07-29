import { Color, Piece, PieceType } from '../types';
import { initializePieces, validBoardSquares } from '../utils/utils';

const TOTAL_SQUARES = 196;
const VALID_SQUARES: ReadonlySet<number> = validBoardSquares();
const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export type BoardConfig = 'CONFIG_1' | 'CONFIG_2';

export type Square = Piece | null | 'OUT';

/**
 * A board setup: the pieces and their square ids, optionally paired with
 * the ids of pieces that should start out inactive (see
 * {@link Board.isPieceActive}). Supplying only `[pieces, squareIds]` is
 * equivalent to an empty inactive list.
 *
 * The three-element form exists specifically so a `Board` clone can be
 * exported (see {@link Board.exportPieces}) and rebuilt elsewhere (e.g.
 * `RuleSet.findCheckmateArchitect`'s counterfactual replay) without
 * losing track of which pieces were frozen.
 */
export type BoardSetup =
  | [pieces: Piece[], squareIds: number[]]
  | [pieces: Piece[], squareIds: number[], inactivePieceIds: string[]];

/**
 * The read-only subset of {@link Board}'s API: every query method, with
 * no way to mutate board state.
 *
 * This is what {@link Game.getBoard} returns to external consumers (e.g.
 * a UI layer), so that inspecting the current position can never be
 * confused with — or accidentally used as a shortcut for — actually
 * playing a move. Mutating the board is only ever valid through
 * {@link Game.advanceTurn} / {@link Game.applyMove}, which route through
 * the active {@link RuleSet}'s bookkeeping (history, captures, move
 * clock, player status).
 *
 * `Board.clone()` is deliberately excluded: it returns a fully mutable
 * `Board`, which would otherwise be a trivial loophole around this
 * interface's entire purpose. Only internal engine code (`RuleSet`) is
 * expected to need a real, mutable `Board` — see `Board`'s class docs.
 */
export interface ReadonlyBoard {
  getConfig(): BoardConfig;
  getOccupiedSquares(): Map<number, string>;
  getOccupiedSquaresByColor(color: Color): [number, string][];
  getPiece(id: string): Piece | undefined;
  getPieceAt(squareId: number): Piece | undefined;
  getPiecesByColor(color: Color): Piece[];
  getSquareOf(pieceId: string): number | undefined;
  getKingSquare(color: Color): number | undefined;
  isOccupied(squareId: number): boolean;
  isValidSquare(id: number): boolean;
  isPieceActive(pieceId: string): boolean;
  exportPieces(): [Piece[], number[], string[]];
  toString(): string;
}

/**
 * Represents the state of a four-player chess board: which pieces exist,
 * where they are located, which squares are occupied, and — separately
 * from piece identity — which pieces are currently inactive.
 *
 * `Board` implements {@link ReadonlyBoard}; external consumers normally
 * only ever see it through that narrower, mutation-free interface (see
 * {@link Game.getBoard}). Internally, `RuleSet` holds/casts to the full
 * `Board` type where genuine mutation is required.
 *
 * ### Activity tracking
 * `Piece` objects themselves are immutable and carry no activity flag
 * (see `types.ts`). Instead, `Board` tracks inactive piece ids in a
 * small internal side-table, kept alongside (and cloned/exported
 * together with) the grid. This is deliberate: `RuleSet`'s
 * legality/check machinery operates almost entirely on isolated `Board`
 * clones (see `RuleSet.isMoveLegal`, `RuleSet.findCheckmateArchitect`)
 * without ever touching `Game`, so `Board` — not `Game` — must be the
 * self-sufficient source of truth for whether a given piece can
 * currently move or threaten a square. `Game`/`GameState`'s
 * `PlayerStatus` remains the authoritative record of *why* a color is
 * inactive; it drives *when* {@link Board.setPlayerPiecesInactive} gets
 * called, but `Board` is what actually remembers the resulting fact.
 *
 * ### Guard policy
 * As a general rule throughout this class: **queries are lenient, mutations
 * are strict.** A query for an invalid/out-of-range square (e.g.
 * {@link Board.isOccupied}, {@link Board.getPieceAt}) simply returns a
 * negative/empty result rather than throwing. A mutation that would
 * corrupt board invariants (e.g. placing a piece on a non-playable square,
 * overwriting an occupied square via {@link Board.restorePiece}) throws
 * immediately, since silently tolerating it would leave the board in an
 * inconsistent state that could be far harder to trace later — especially
 * once this class is on the hot path of automated search.
 */
export class Board implements ReadonlyBoard {
  private grid: Square[] = [];

  private kingSquares: Record<Color, number | undefined> = {
    [Color.RED]: undefined,
    [Color.BLUE]: undefined,
    [Color.YELLOW]: undefined,
    [Color.GREEN]: undefined,
  };

  /**
   * Ids of pieces currently marked inactive (see class-level remarks).
   * Membership means "cannot move, cannot capture, cannot threaten a
   * square" — the piece otherwise remains a normal, capturable occupant.
   */
  private inactivePieceIds = new Set<string>();

  private readonly config: BoardConfig;

  constructor(
    initialPieces?: BoardSetup,
    config: BoardConfig = 'CONFIG_1'
  ) {
    this.config = config;

    this.grid = new Array<Square>(TOTAL_SQUARES).fill(null);
    for (let squareId = 0; squareId < TOTAL_SQUARES; squareId += 1) {
      if (!VALID_SQUARES.has(squareId)) this.grid[squareId] = 'OUT';
    }

    const setup = initialPieces ?? this.buildDefaultSetup(config);

    this.assignInitialPieces(setup[0], setup[1]);

    const inactivePieceIds = setup.length === 3 ? setup[2] : [];
    for (const id of inactivePieceIds) this.inactivePieceIds.add(id);
  }

  public getConfig(): BoardConfig {
    return this.config;
  }

  public getOccupiedSquares(): Map<number, string> {
    const occupied = new Map<number, string>();

    this.grid.forEach((square, squareId) => {
      if (square !== null && square !== 'OUT') occupied.set(squareId, square.id);
    });

    return occupied;
  }

  public getOccupiedSquaresByColor(color: Color): [number, string][] {
    const result: [number, string][] = [];

    this.grid.forEach((square, squareId) => {
      if (square !== null && square !== 'OUT' && square.color === color) {
        result.push([squareId, square.id]);
      }
    });

    return result;
  }

  public getPiece(id: string): Piece | undefined {
    const index = this.findIndexById(id);

    return index === -1 ? undefined : (this.grid[index] as Piece);
  }

  public getPieceAt(squareId: number): Piece | undefined {
    const square = this.grid[squareId];

    return square !== undefined && square !== null && square !== 'OUT'
      ? square
      : undefined;
  }

  public getPiecesByColor(color: Color): Piece[] {
    return this.grid.filter(
      (square): square is Piece =>
        square !== null && square !== 'OUT' && square.color === color
    );
  }

  public getSquareOf(pieceId: string): number | undefined {
    const index = this.findIndexById(pieceId);

    return index === -1 ? undefined : index;
  }

  public getKingSquare(color: Color): number | undefined {
    return this.kingSquares[color];
  }

  public isOccupied(squareId: number): boolean {
    const square = this.grid[squareId];

    return square !== undefined && square !== null && square !== 'OUT';
  }

  public isValidSquare(id: number): boolean {
    return this.grid[id] !== undefined && this.grid[id] !== 'OUT';
  }

  /**
   * Checks whether a piece is currently active — i.e. eligible to move,
   * capture, or threaten a square. A piece not currently tracked at all
   * (e.g. an unknown or already-captured id) is treated as active by
   * default, consistent with this class's lenient query policy.
   *
   * @param pieceId - The stable id of the piece to check.
   */
  public isPieceActive(pieceId: string): boolean {
    return !this.inactivePieceIds.has(pieceId);
  }

  /**
   * Places a piece on a square, moving it from its current square if
   * applicable.
   *
   * ⚠️ **Capture behavior**: if another piece already occupies `squareId`,
   * that piece is removed from the board entirely, regardless of color.
   *
   * @throws {@link RangeError} If `squareId` is not a valid, playable
   * square (see the class-level guard policy).
   * @returns The moved piece, or `undefined` if no piece with `pieceId`
   * exists on the board.
   */
  public placePiece(pieceId: string, squareId: number): Piece | undefined {
    this.assertPlayableSquare(squareId);

    const fromIndex = this.findIndexById(pieceId);
    if (fromIndex === -1) return undefined;

    const piece = this.grid[fromIndex] as Piece;
    const occupant = this.grid[squareId];

    if (occupant !== null && occupant !== 'OUT' && occupant.type === PieceType.KING) {
      this.kingSquares[occupant.color] = undefined;
    }

    this.grid[fromIndex] = null;
    this.grid[squareId] = piece;

    if (piece.type === PieceType.KING) {
      this.kingSquares[piece.color] = squareId;
    }

    return piece;
  }

  public removePiece(pieceId: string): Piece | undefined {
    const index = this.findIndexById(pieceId);
    if (index === -1) return undefined;

    const piece = this.grid[index] as Piece;
    this.grid[index] = null;

    if (piece.type === PieceType.KING && this.kingSquares[piece.color] === index) {
      this.kingSquares[piece.color] = undefined;
    }

    return piece;
  }

  /**
   * Reinserts a previously removed piece directly onto a square, bypassing
   * normal capture semantics. Undo-only (see {@link RuleSet.undoMoveOnBoard}).
   *
   * @throws {@link RangeError} If `squareId` is not a valid, playable
   * square, or is already occupied — the latter would silently discard
   * whatever piece was already there, which almost certainly indicates a
   * caller bug during undo replay rather than intended behavior.
   */
  public restorePiece(piece: Piece, squareId: number): void {
    this.assertPlayableSquare(squareId);

    if (this.isOccupied(squareId)) {
      throw new Error(
        `Cannot restore piece ${piece.id} to square ${squareId}: square is already occupied.`
      );
    }

    this.grid[squareId] = piece;

    if (piece.type === PieceType.KING) {
      this.kingSquares[piece.color] = squareId;
    }
  }

  public revertPromotion(pieceId: string): void {
    const index = this.findIndexById(pieceId);
    if (index === -1) return;

    const piece = this.grid[index] as Piece;
    if (piece.type === PieceType.PAWN) return;

    this.grid[index] = { ...piece, type: PieceType.PAWN };
  }

  /**
   * Marks a player's pieces inactive. Idempotent — safe to call
   * repeatedly for the same color.
   *
   * @param color - The player whose pieces should be deactivated.
   * @param keepKingActive - If `true`, the king is left active while
   * every other piece of `color` is deactivated.
   */
  public setPlayerPiecesInactive(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    for (const piece of this.getPiecesByColor(color)) {
      if (piece.type === PieceType.KING && keepKingActive) continue;

      this.inactivePieceIds.add(piece.id);
    }
  }

  public setPromotionPieceType(pieceId: string, newType: PieceType): void {
    const index = this.findIndexById(pieceId);
    if (index === -1) return;

    const piece = this.grid[index] as Piece;
    if (piece.type !== PieceType.PAWN) return;

    this.grid[index] = { ...piece, type: newType };
  }

  public clone(): Board {
    const clone = new Board([[], []], this.config);

    clone.grid = [...this.grid];
    clone.kingSquares = { ...this.kingSquares };
    clone.inactivePieceIds = new Set(this.inactivePieceIds);

    return clone;
  }

  public exportPieces(): [Piece[], number[], string[]] {
    const pieces: Piece[] = [];
    const positions: number[] = [];

    this.grid.forEach((square, squareId) => {
      if (square !== null && square !== 'OUT') {
        pieces.push(square);
        positions.push(squareId);
      }
    });

    return [pieces, positions, Array.from(this.inactivePieceIds)];
  }

  private findIndexById(id: string): number {
    return this.grid.findIndex(
      square => square !== null && square !== 'OUT' && square.id === id
    );
  }

  private assignInitialPieces(pieces: Piece[], squareIds: number[]): void {
    if (pieces.length !== squareIds.length) {
      throw new Error(
        `Board setup mismatch: received ${pieces.length} pieces but ${squareIds.length} square ids.`
      );
    }

    const seenIds = new Set<string>();
    const seenSquares = new Set<number>();

    pieces.forEach((piece, index) => {
      const squareId = squareIds[index];

      this.assertPlayableSquare(squareId);

      if (seenIds.has(piece.id)) {
        throw new Error(`Duplicate piece id in board setup: "${piece.id}".`);
      }
      seenIds.add(piece.id);

      if (seenSquares.has(squareId)) {
        throw new Error(`Two pieces assigned to the same square: ${squareId}.`);
      }
      seenSquares.add(squareId);

      this.grid[squareId] = piece;

      if (piece.type === PieceType.KING) {
        this.kingSquares[piece.color] = squareId;
      }
    });
  }

  private assertPlayableSquare(squareId: number): void {
    if (!Number.isInteger(squareId) || squareId < 0 || squareId >= TOTAL_SQUARES) {
      throw new RangeError(`Square id ${squareId} is out of range.`);
    }

    if (this.grid[squareId] === 'OUT') {
      throw new RangeError(`Square id ${squareId} is not part of the playable board.`);
    }
  }

  private buildDefaultSetup(config: BoardConfig): [Piece[], number[]] {
    const pieces: Piece[] = [];
    const positions: number[] = [];

    for (const color of PLAYER_COLORS) {
      const [piecesForColor, positionsForColor] = this.initializeColorPieces(color, config) ??
        [undefined, undefined];

      if (piecesForColor) pieces.push(...piecesForColor);
      if (positionsForColor) positions.push(...positionsForColor);
    }

    return [pieces, positions];
  }

  private initializeColorPieces(color: Color, config: BoardConfig): [Piece[], number[]] | undefined {
    switch (config) {
      case 'CONFIG_1':
        return initializePieces(color);
      case 'CONFIG_2':
        throw new Error('BoardConfig.CONFIG_2 is not yet implemented.');
    }
  }

  public toString(): string {
    const entries: string[] = [];

    for (let squareId = 0; squareId < TOTAL_SQUARES; squareId += 1) {
      const square = this.grid[squareId];
      if (square !== null && square !== 'OUT') {
        entries.push(`${square.id},${squareId}`);
      }
    }

    return entries.length === 0 ? 'empty board' : entries.join(';');
  }
}