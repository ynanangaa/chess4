import { Piece } from '../types/piece';
import { Color, PieceType } from '../types';
import { initializePieces, validBoardSquares } from '../utils/utils';

/**
 * Represents the state of a four-player chess board: which pieces exist,
 * where they are located, and which squares are occupied.
 *
 * `Board` is intentionally a pure state container — it knows nothing about
 * move legality, turn order, or check detection (see {@link RuleSet} and
 * {@link Game} for that). It only guarantees internal consistency between
 * pieces, their positions, and square occupancy.
 *
 * ### Invariants
 * - Every `Piece` is treated as **immutable**: any "update" (e.g. deactivating
 *   a piece, promoting a pawn) replaces the piece object in the internal map
 *   rather than mutating it in place. This is what makes {@link Board.clone}
 *   safe as a shallow copy.
 * - `piecePositions` and `occupiedSquares` are always kept in sync as
 *   inverses of each other.
 */
export class Board {
  /** Pieces keyed by their stable piece id. */
  private pieces: Map<string, Piece> = new Map();

  /** Square id occupied by each piece, keyed by piece id. */
  private piecePositions: Map<string, number> = new Map();

  /** Reverse lookup of {@link piecePositions}: piece id keyed by square id. */
  private occupiedSquares: Map<number, string> = new Map();

  /** Set of square ids that are valid for the four-player board shape. */
  private validSquares: Set<number> = validBoardSquares();

  /**
   * Creates a new board.
   *
   * @param initialPieces - Optional explicit setup as a tuple of
   * `[pieces, squareIds]`, where `squareIds[i]` is the starting square for
   * `pieces[i]`. If omitted, the board is initialized with the standard
   * four-player starting position (see {@link Board.buildDefaultSetup}).
   *
   * @example
   * ```ts
   * const board = new Board(); // standard starting position
   * const empty = new Board([[], []]); // empty board
   * ```
   */
  constructor(initialPieces?: [Piece[], number[]]) {
    const [pieces, initialSquareIds] = initialPieces ?? this.buildDefaultSetup();

    pieces.forEach((piece, index) => {
      const squareId = initialSquareIds[index];

      this.pieces.set(piece.id, piece);
      this.piecePositions.set(piece.id, squareId);
      this.occupiedSquares.set(squareId, piece.id);
    });
  }

  /**
   * Returns a snapshot of all occupied squares.
   *
   * @returns A new `Map` of square id → piece id. Mutating the returned map
   * does not affect the board's internal state.
   */
  public getOccupiedSquares(): Map<number, string> {
    return new Map(this.occupiedSquares);
  }

  /**
   * Returns all occupied squares belonging to pieces of a given color.
   *
   * @param color - The color to filter by.
   * @returns An array of `[squareId, pieceId]` tuples. Note this returns
   * piece **ids**, not `Piece` objects — use {@link Board.getPiece} to
   * resolve them if needed.
   */
  public getOccupiedSquaresByColor(color: Color): [number, string][] {
    return Array.from(this.occupiedSquares.entries()).filter(([, pieceId]) => {
      const piece = this.getPiece(pieceId);

      return piece?.color === color;
    });
  }

  /**
   * Retrieves a piece by its stable id.
   *
   * @param id - The piece id.
   * @returns The piece, or `undefined` if no piece with that id exists on
   * the board (e.g. it was captured/removed).
   */
  public getPiece(id: string): Piece | undefined {
    return this.pieces.get(id);
  }

  /**
   * Retrieves the piece currently occupying a given square.
   *
   * @param squareId - The square id to inspect.
   * @returns The occupying piece, or `undefined` if the square is empty.
   */
  public getPieceAt(squareId: number): Piece | undefined {
    const pieceId = this.occupiedSquares.get(squareId);

    if (!pieceId) return undefined;

    return this.pieces.get(pieceId);
  }

  /**
   * Returns all pieces belonging to a given color, regardless of whether
   * they are active or captured status (see {@link Piece.active}).
   *
   * @param color - The color to filter by.
   */
  public getPiecesByColor(color: Color): Piece[] {
    return Array.from(this.pieces.values()).filter(piece => piece.color === color);
  }

  /**
   * Returns the square currently occupied by a given piece.
   *
   * @param pieceId - The piece id to locate.
   * @returns The square id, or `undefined` if the piece does not exist on
   * the board.
   */
  public getPositionOf(pieceId: string): number | undefined {
    return this.piecePositions.get(pieceId);
  }

  /**
   * Checks whether a square currently holds a piece.
   *
   * @param squareId - The square id to check.
   */
  public isOccupied(squareId: number): boolean {
    return this.occupiedSquares.has(squareId);
  }

  /**
   * Checks whether a square id is part of the valid four-player board shape.
   *
   * @param id - The square id to check.
   */
  public isValidSquare(id: number): boolean {
    return this.validSquares.has(id);
  }

  /**
   * Places a piece on a square, moving it from its current square if
   * applicable.
   *
   * ⚠️ **Capture behavior**: if another piece already occupies the
   * destination square, that piece is **removed from the board entirely**
   * (captured), regardless of color. Callers responsible for enforcing
   * legality (e.g. `RuleSet`) must check this before calling `placePiece`
   * if that isn't the desired outcome.
   *
   * ⚠️ This method does **not** validate that `squareId` is a valid board
   * square (see {@link Board.isValidSquare}); callers are expected to
   * validate beforehand.
   *
   * @param pieceId - The id of the piece to place.
   * @param squareId - The destination square id.
   * @returns The moved piece, or `undefined` if no piece with `pieceId`
   * exists on the board.
   */
  public placePiece(pieceId: string, squareId: number): Piece | undefined {
    const piece = this.pieces.get(pieceId);

    if (!piece) return undefined;

    const currentSquareId = this.piecePositions.get(pieceId);
    if (currentSquareId !== undefined) {
      this.occupiedSquares.delete(currentSquareId);
      this.piecePositions.delete(pieceId);
    }

    const existingPieceId = this.occupiedSquares.get(squareId);
    if (existingPieceId !== undefined) {
      this.occupiedSquares.delete(squareId);
      this.piecePositions.delete(existingPieceId);
      this.pieces.delete(existingPieceId);
    }

    this.piecePositions.set(pieceId, squareId);
    this.occupiedSquares.set(squareId, pieceId);

    return piece;
  }

  /**
   * Removes a piece from the board entirely (e.g. as a result of capture
   * or elimination).
   *
   * @param pieceId - The id of the piece to remove.
   * @returns The removed piece, or `undefined` if no piece with `pieceId`
   * exists on the board.
   */
  public removePiece(pieceId: string): Piece | undefined {
    const piece = this.pieces.get(pieceId);

    if (!piece) return undefined;

    const currentSquareId = this.piecePositions.get(pieceId);
    if (currentSquareId !== undefined) {
      this.occupiedSquares.delete(currentSquareId);
      this.piecePositions.delete(pieceId);
    }

    this.pieces.delete(pieceId);
    return piece;
  }

  /**
   * Marks all of a player's pieces as inactive, typically used when a
   * player is eliminated from the game.
   *
   * The king is looked up via the conventional id format `K-{color}`
   * (see {@link initializePieces}). If this convention changes elsewhere,
   * this method must be updated accordingly.
   *
   * @param color - The color whose pieces should be deactivated.
   * @param keepKingActive - If `true`, the player's king is left active
   * even though the rest of their pieces are deactivated. Defaults to
   * `false`.
   */
  public setPlayerPiecesInactive(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    const king = this.pieces.get(`K-${color}`);
    if (king && king.active && !keepKingActive) this.pieces.set(
      `K-${color}`, 
      {...king, active: false}
    );
    this.pieces.forEach((p, id, _) => {
      if (p.color === color && p.type !== PieceType.KING) {
        if(!p.active) return;
        this.pieces.set(p.id, {...p, active: false })
      }
    });
  }

  /**
   * Promotes a pawn to a new piece type.
   *
   * No-op if the piece does not exist or is not currently a pawn.
   *
   * @param pieceId - The id of the pawn being promoted.
   * @param newType - The type to promote the pawn to (e.g. `QUEEN`).
   */
  public setPromotionPieceType(pieceId: string, newType: PieceType): void {
    const piece = this.getPiece(pieceId);

    if (piece?.type === PieceType.PAWN) {
      this.pieces.set(pieceId, { ...piece, type: newType });
    }
  }

  /**
   * Creates an independent copy of this board.
   *
   * This is a **shallow clone with respect to `Piece` objects**: the new
   * board's internal maps are new, but the `Piece` objects themselves are
   * shared by reference with the original board. This is safe as long as
   * pieces are always treated as immutable (replaced, never mutated in
   * place) — which holds true for all mutators in this class.
   *
   * @returns A new, independent `Board` instance with the same state.
   */
  public clone(): Board {
    const pieces = Array.from(this.pieces.values());
    const positions = pieces.map(piece => this.piecePositions.get(piece.id)!);

    return new Board([pieces, positions]);
  }

  /**
   * Builds the default four-player starting position.
   *
   * @returns A `[pieces, squareIds]` tuple covering all four colors
   * (RED, BLUE, YELLOW, GREEN).
   */
  private buildDefaultSetup(): [Piece[], number[]] {
    const pieces: Piece[] = [];
    const positions: number[] = [];

    [
      initializePieces(Color.RED),
      initializePieces(Color.BLUE),
      initializePieces(Color.YELLOW),
      initializePieces(Color.GREEN)
    ].forEach(([piecesForColor, positionsForColor]) => {
      pieces.push(...piecesForColor);
      positions.push(...positionsForColor);
    });

    return [pieces, positions];
  }

  /**
   * Serializes the board to a deterministic, order-independent string
   * suitable for comparison purposes (e.g. detecting repeated positions).
   *
   * This is **not** intended as a human-readable board display — it is a
   * flat, sorted list of `pieceId,squareId` pairs.
   *
   * Format: `"pieceId,squareId;pieceId,squareId;..."`, sorted by piece id.
   *
   * @returns `"empty board"` if no pieces are on the board, otherwise the
   * serialized state string.
   */
  public toString(): string {
    if (!this.piecePositions.size)
      return "empty board";

    return Array
      .from(this.piecePositions.entries())
      .sort(([id1], [id2]) => id1.localeCompare(id2))
      .map(([pieceId, position]) => `${pieceId},${position}`)
      .join(";");
  }
}