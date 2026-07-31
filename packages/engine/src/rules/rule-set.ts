import { Board } from "../board";
import { Game } from "../game";
import { Move, MoveGenerator } from "../moves";
import { rookCastleDirectionOffset } from "../moves/rook-moves";
import { CapturedPiece, Color, GameStatus, Piece, PieceType } from "../types";
import { pickRandomElement, rookInitialSquareId } from "../utils/utils";

/**
 * Base rules engine for a four-player chess variant.
 *
 * `RuleSet` follows a **template method** pattern: it owns the shared
 * orchestration logic that is the same regardless of variant specifics —
 * applying moves to a {@link Board}, recording history on a {@link Game},
 * filtering pseudo-legal moves down to truly legal ones (i.e. moves that
 * don't leave the mover's own king in check), and computing repetition
 * keys for draw detection — while delegating variant-specific rules
 * (castling availability, promotion, check
 * detection, endgame conditions, and 50-move/insufficient-material draw
 * detection) to concrete subclasses via `abstract` methods.
 *
 * Concrete subclasses are expected to implement all abstract members
 * declared below to produce a fully working rules engine.
 */
export abstract class RuleSet {

  /** The four player colors, in canonical turn order. */
  protected static PLAYER_COLORS = [
    Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN
  ];

  /**
   * @param moveGenerator - Strategy responsible for generating pseudo-legal
   * destination squares for a given piece (i.e. moves that follow the
   * piece's movement pattern, without regard to check).
   */
  constructor(
    protected readonly moveGenerator: MoveGenerator
  ) {}

/**
 * Advances the game by processing the current player's turn (a real
 * move for an active player, or an auto-played/skipped turn for a
 * resigned, timed-out, checkmated, or stalemated one), then
 * automatically settles every subsequent player in turn order who
 * turns out to already be inactive — including a player whose inactive
 * status is only discoverable as a direct result of this very call
 * (e.g. a move that delivers checkmate to a color several turns away
 * from actually being current) — until either a genuinely active
 * player is reached, or the game ends.
 *
 * Checkmate/stalemate for a color can only ever be detected by
 * evaluating them as `currentPlayerColor` (see
 * `DefaultRuleSet.updateGameState`). Without this settling step, a
 * color that becomes mated while one or more *other* already-eliminated
 * colors sit between them and the mover in turn order would never get
 * re-evaluated until it's their turn — but requiring a move from
 * someone with none available is a deadlock. This method's loop closes
 * that gap: callers never need to invoke `advanceTurn` repeatedly just
 * to skip past already-finished players.
 *
 * @param game - The game to advance.
 * @param move - The move to play, required only when the current player
 * is active.
 * @returns `true` if the turn was successfully advanced; `false` if the
 * game is already over, or (for an active player) if `move` is missing,
 * refers to a piece not owned by the current player, or fails to apply.
 */
public advanceTurn(game: Game, move?: Move): boolean {
  if (game.isOver()) return false;

  const currentPlayer = game.getCurrentPlayerColor();

  if (game.isPlayerActive(currentPlayer)) {
    if (!move) return false;

    const movedPiece = game.getBoard().getPiece(move.pieceId);
    if (!movedPiece || movedPiece.color !== currentPlayer) return false;

    game.incrementPositionCount(this.computePositionKey(game));
    if (!this.applyMove(move, game)) return false;

    game.advanceCurrentPlayer();
  } else {
    const hasKingMoved = this.autoPlayOrSkip(currentPlayer, game);
    if (hasKingMoved) game.advanceCurrentPlayer();
  }

  this.settleUpcomingTurns(game);

  return true;
}

/**
 * Repeatedly evaluates (via `applyRulesPostMove`) whoever is now
 * `currentPlayerColor`, auto-skipping them and moving on if they turn
 * out to be inactive, and stopping as soon as either an active player
 * is found or the game ends.
 *
 * Bounded by the player count as a defensive guard against an
 * unexpected infinite loop; in practice the game always ends or an
 * active player is found within at most one full round.
 */
private settleUpcomingTurns(game: Game): void {
  let guard = 0;

  while (guard < RuleSet.PLAYER_COLORS.length) {
    this.applyRulesPostMove(game);

    if (game.isOver()) return;

    const current = game.getCurrentPlayerColor();
    if (game.isPlayerActive(current)) return;

    this.autoPlayOrSkip(current, game);
    game.advanceCurrentPlayer();
    guard += 1;
  }
}

/**
 * Handles one inactive player's turn: a resigned/timed-out player gets
 * a random legal king move if one exists, otherwise (and for a
 * checkmated/stalemated player) only the move clock is incremented.
 */
private autoPlayOrSkip(color: Color, game: Game): boolean {
  if (game.isPlayerResignedOrTimedOut(color)) {
    const kingMove = this.chooseRandomKingMove(color, game);
    if (kingMove) {
      this.applyMove(kingMove, game);
      return true;
    }
  }

  game.incrementMoveClock();
  return false;
}

  /**
   * Applies a move to the game's board and records its effects (captured
   * piece, moved-piece tracking for castling-rights purposes, and
   * post-move check annotations) into the game's history.
   *
   * ⚠️ This method does **not** itself validate that `move` is legal — it
   * trusts the caller to supply a move already vetted for legality (e.g.
   * via {@link RuleSet.getLegalMoves}). It also does **not** advance the
   * turn to the next player; see {@link RuleSet.advanceTurn} for that.
   *
   * @param move - The move to apply.
   * @param game - The game whose board and history should be updated.
   * @returns `true` if the move was applied successfully; `false` if the
   * game is already over, or if the move could not be applied (e.g. the
   * piece no longer exists on the board).
   * 
   * @remarks
   * `game.getBoard()` returns a `ReadonlyBoard`; this cast to `Board` is
   * intentional and confined to `RuleSet` — it is the one component
   * permitted to mutate the board directly (see `Game.getBoard`).
   */
  public applyMove(move: Move, game: Game): boolean {
    if (game.isOver()) return false;
    
    const [appliedMove, capturedPiece]: 
      [Move | undefined, CapturedPiece | undefined]
        = this.applyMoveOnBoard(move, game.getBoard() as Board);
    if (!appliedMove) return false;

    // Stage 2 : Game (history, moved and captured pieces, check infos)
    if (capturedPiece) {
      game.addCapturedPiece(capturedPiece.id, capturedPiece)
    }
    const movedPiece = game.getBoard().getPiece(appliedMove.pieceId)!;

    game.addMovedPiece(appliedMove.pieceId);
    if (move.castle) {
        const color = movedPiece.color;
        game.addMovedPiece(`R-${color}-${move.castle}`);
    }
    this.recordMove(appliedMove, game);

    return true;
  }
  
  /**
   * Applies a move directly onto a board, handling all special-move
   * bookkeeping (capture, promotion, castling rook
   * movement) and physically relocating the piece.
   *
   * @param move - The move to apply. Only `pieceId`, `to`, and
   * `pawnSpecialMove`/`castle` (if present) are used as input; `capture`
   * is (re)computed as part of this method.
   * @param board - The board to mutate.
   * @returns A tuple of `[appliedMove, capturedPiece]`, where `appliedMove`
   * is the input move enriched with the resolved `capture` id (or
   * `undefined` if the piece being moved no longer exists on the board),
   * and `capturedPiece` is the captured piece annotated with
   * `capturedBy`, or `undefined` if nothing was captured.
   */
  protected applyMoveOnBoard(
    move: Move,
    board: Board
  ): [Move | undefined, CapturedPiece | undefined] {
    let appliedMove = this.withDirectCapture(move, board);
    const directCapturedId = appliedMove.capture;

    this.applyPromotion(appliedMove, board);
    this.applyCastling(move, board);

    const capturedPieceId = directCapturedId;
    const capturedPieceWasActive =
      capturedPieceId !== undefined ? board.isPieceActive(capturedPieceId) : undefined;
    const capturedPiece =
      capturedPieceId !== undefined ? board.getPiece(capturedPieceId)! : undefined;

    const movedPiece = board.placePiece(move.pieceId, move.to);

    if (!movedPiece) return [undefined, undefined];
    if (!capturedPiece) return [appliedMove, undefined];

    return [
      appliedMove,
      {
        ...capturedPiece,
        capturedBy: movedPiece.color,
        wasActive: capturedPieceWasActive!
      }
    ];
  }

  /**
   * Enriches a move with `capture` if a piece already occupies the
   * destination square.
   */
  private withDirectCapture(move: Move, board: Board): Move {
    const capturedPiece = board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  /**
   * Promotes the moved piece to a queen on the board if the move is
   * flagged as a promotion.
   *
   * ⚠️ Always promotes to `QUEEN` — there is currently no support for
   * choosing an under-promotion (knight/rook/bishop).
   */
  private applyPromotion(move: Move, board: Board): void {
    if (move.pawnSpecialMove === "promotion") {
      board.setPromotionPieceType(move.pieceId, PieceType.QUEEN);
    }
  }

  /**
   * Moves the appropriate rook alongside the king as part of a castling
   * move. No-op if the move is not flagged as a castle.
   */
  private applyCastling(move: Move, board: Board): void {
    if (!move.castle) return;

    const color = board.getPiece(move.pieceId)!.color;
    const rookId = `R-${color}-${move.castle}`;

    board.placePiece(
      rookId,
      move.to + rookCastleDirectionOffset(color, move.castle)
    );
  }

  /**
   * Reverses a move previously applied via {@link RuleSet.applyMoveOnBoard},
   * restoring `board` to the state it was in immediately before `move`
   * was applied.
   *
   * ⚠️ This is used exclusively for causal analysis — specifically,
   * {@link RuleSet.findCheckmateArchitect}'s counterfactual replay of a
   * bounded move window — and is never part of normal forward gameplay.
   * It relies on `game` still holding the original {@link CapturedPiece}
   * record for any piece captured by `move` (see
   * {@link Game.getCapturedPiece}), since a captured piece's data is no
   * longer recoverable from the board itself once removed.
   *
   * @param move - A previously applied move to undo. Must be the exact
   * move object produced by {@link RuleSet.applyMoveOnBoard} (i.e. with
   * `capture` already resolved), not a raw pre-application candidate.
   * @param board - The board to mutate. Must currently reflect the state
   * that resulted from applying `move`.
   * @param game - Used solely to look up captured-piece data for restoration.
   */
  protected undoMoveOnBoard(move: Move, board: Board, game: Game): void {
    if (move.pawnSpecialMove === "promotion") {
      board.revertPromotion(move.pieceId);
    }

    if (move.castle) {
      const color = board.getPiece(move.pieceId)!.color;

      board.placePiece(
        `R-${color}-${move.castle}`,
        rookInitialSquareId(color, move.castle === "kingside")
      );
    }

    board.placePiece(move.pieceId, move.from);

    if (move.capture !== undefined) {
      const { capturedBy, wasActive, ...piece } = game.getCapturedPiece(move.capture)!;

      board.restorePiece(piece, move.to);
    }
  }

private recordMove(move: Move, game: Game): void {
  const checkedAfter = this.getCheckedKings(game.getBoard() as Board);

  const newlyChecked = RuleSet.PLAYER_COLORS.filter(color =>
    checkedAfter.has(color) && this.isCheckCausedByMove(color, move, game)
  );

  game.addMoveToHistory(
    newlyChecked.length > 0 ? { ...move, check: newlyChecked } : move
  );
}

/**
 * Determines whether `checkedColor`'s king being in check right after
 * `move` was applied is causally attributable to `move` itself, rather
 * than merely a persisting consequence of something that already
 * happened earlier.
 *
 * Mirrors {@link RuleSet.findCheckmateArchitect}'s windowed
 * counterfactual technique: `checkedColor`'s king can never be in check
 * immediately after `checkedColor`'s own last move (that would make
 * their own move illegal), so the only real question is whether `move`
 * alone — replayed directly on top of the position as it stood right
 * after `checkedColor`'s own last move, with every intervening move
 * made by other colors stripped out — still produces check on
 * `checkedColor`'s king.
 *
 * @param checkedColor - A color whose king is currently in check on
 * `game`'s board, immediately after `move` was applied.
 * @param move - The just-applied move (already enriched with `capture`
 * /`castle`/`pawnSpecialMove`, i.e. the exact object produced by
 * {@link RuleSet.applyMoveOnBoard}). Not yet present in `game`'s history.
 * @param game - The game providing board/history context.
 */
private isCheckCausedByMove(checkedColor: Color, move: Move, game: Game): boolean {
  const history = game.getHistory();
  const windowStart = this.findLastMoveIndexOf(checkedColor, history, game) + 1;
  const window = history.slice(windowStart);

  // No intervening moves since checkedColor's own last move: their king
  // was certainly not in check right beforehand, so `move` is
  // necessarily what caused it.
  if (window.length === 0) return true;

  const board = (game.getBoard() as Board).clone();

  this.undoMoveOnBoard(move, board, game);
  for (let i = window.length - 1; i >= 0; i -= 1) {
    this.undoMoveOnBoard(window[i], board, game);
  }

  this.applyMoveOnBoard(move, board);

  return this.isKingInCheck(board, checkedColor);
}

  /**
   * Computes the set of colors whose king is currently in check on `board`,
   * regardless of which color(s) are delivering those checks.
   *
   * Built on {@link RuleSet.isKingInCheck}; concrete subclasses do not
   * need to implement this separately.
   *
   * @param board - The board to evaluate.
   */
  protected getCheckedKings(board: Board): Set<Color> {
    const checked = new Set<Color>();

    for (const color of RuleSet.PLAYER_COLORS) {
      if (this.isKingInCheck(board, color)) checked.add(color);
    }

    return checked;
  }

  /**
   * Picks a random legal king move for a given color, used to auto-play a
   * turn on behalf of a resigned or timed-out player who still has legal
   * king moves available.
   *
   * @returns A random legal king move, or `undefined` if the king has none.
   */
  private chooseRandomKingMove(color: Color, game: Game): Move | undefined {
    const kingMoves = this.getLegalMoves(`K-${color}`, game);
    if (kingMoves.length === 0) return undefined;

    return pickRandomElement(kingMoves);
  }

  /**
   * Checks whether the current position is a draw under any supported
   * drawing rule: threefold repetition, the 50-move rule, or insufficient
   * material.
   *
   * @see {@link RuleSet.isDrawByTripleRepetition}
   * @see {@link RuleSet.isDrawBy50MovesRule}
   * @see {@link RuleSet.isDrawByInsufficientMaterial}
   */
  protected isDraw(game: Game): boolean {
    return (this.isDrawByTripleRepetition(game) || 
      this.isDrawBy50MovesRule(game) ||
      this.isDrawByInsufficientMaterial(game)
    )
  }

  /**
   * Computes a deterministic string key representing the game's current
   * position for repetition-detection purposes, incorporating board
   * state, the player to move, and remaining castling rights — analogous
   * in purpose to a FEN's position fields, minus an en passant target
   * field, since this variant does not support en passant.
   *
   * @param game - The game whose position should be hashed.
   * @returns A multi-line string uniquely representing the position,
   * suitable for use as a map key (see {@link Game.incrementPositionCount}
   * / {@link Game.getPositionCount}).
   */
  public computePositionKey(game: Game): string {
    const board = game.getBoard();
    const currentPlayer = game.getCurrentPlayerColor();

    const castlingRights = this.getCastleMoves(
      currentPlayer, 
      game
    ).map(c => c.castle!);

    castlingRights.sort();

    return [
      board.toString(),
      currentPlayer,
      `castling=${castlingRights.length > 0
        ? castlingRights.join(";")
        : "none"}`
    ].join("\n");
  }

  /**
   * Hook invoked after a move (or a skipped/auto-played turn) has been
   * processed, giving subclasses a chance to update derived game state —
   * typically recomputing each player's {@link PlayerStatus} (check,
   * checkmate, stalemate), applying draw rules via
   * {@link RuleSet.isDraw}, and calling {@link RuleSet.endGame} when the
   * game has concluded.
   */
  protected abstract applyRulesPostMove(game: Game): void;

  /**
   * Finalizes the game — expected to set the game's status to
   * {@link GameStatus.OVER} and record the outcome (winner(s), draw, etc.).
   */
  abstract endGame(game: Game): void;

  /**
   * Computes all fully legal moves for a given piece — i.e. pseudo-legal
   * moves (from {@link MoveGenerator}), with any destination occupied by
   * a still-active enemy king excluded, expanded with any applicable
   * special pawn moves or castling moves, then filtered to exclude any
   * move that would leave the mover's own king in check.
   *
   * Returns an empty array if the piece doesn't exist, or if its owning
   * player is already checkmated or stalemated.
   *
   * @param pieceId - The id of the piece to compute legal moves for.
   * @param game - The game providing board and player-state context.
   * @returns All legal moves available to the piece.
   * 
   * @remarks
   * The `as Board` cast here (and in {@link RuleSet.hasLegalMove}) is
   * needed because `game.getBoard()` returns `ReadonlyBoard`, while the
   * candidate-generation/legality pipeline below needs to pass a real
   * `Board` into `MoveGenerator` and `RuleSet.isMoveLegal`. This is safe:
   * `RuleSet` is the trusted internal component allowed to hold a
   * mutable `Board` reference (see `Game.getBoard`).
   */
  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = game.getBoard() as Board;
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return [];

    if (
      game.isPlayerCheckMated(selectedPiece.color) ||
      game.isPlayerStalled(selectedPiece.color)
    ) {
      return [];
    }

    const candidates = this.generateCandidateMoves(selectedPiece, board, game);

    return candidates.filter(move =>
      this.isMoveLegal(move, selectedPiece.color, board)
    );
  }

  /**
   * Generates the full candidate move list for a piece: pseudo-legal
   * destinations (excluding any still-active enemy king's square),
   * expanded with special pawn moves or castling as applicable — but
   * **not yet filtered for check-legality**.
   *
   * Factored out so that {@link RuleSet.getLegalMoves} and
   * {@link RuleSet.hasLegalMove} share the exact same candidate-generation
   * logic and can never diverge.
   */
  private generateCandidateMoves(
    piece: Piece,
    board: Board,
    game: Game
  ): Move[] {
    const from = board.getSquareOf(piece.id)!;

    const pseudoLegalMoves = this.moveGenerator
      .generateMovesForPiece(piece, board)
      .filter(to => !this.isActiveEnemyKingSquare(to, piece.color, board));

    if (pseudoLegalMoves.length === 0) return [];

    let moves = pseudoLegalMoves.map(to =>
      this.moveGenerator.buildMove(piece.id, from, to)
    );

    if (piece.type === PieceType.PAWN) {
      moves = this.withPawnSpecialMoves(piece, from, game, moves);
    }

    if (piece.type === PieceType.KING) {
      moves.push(...this.getCastleMoves(piece.color, game));
    }

    return moves;
  }

  /**
   * Checks whether a square is occupied by an opponent's king that is
   * still active — i.e. a king that must not be a legal capture target.
   *
   * @param squareId - The square to check.
   * @param color - The color of the piece considering this destination
   * (used to determine which kings count as "enemy").
   * @param board - The board to evaluate against.
   */
  private isActiveEnemyKingSquare(
    squareId: number,
    color: Color,
    board: Board
  ): boolean {
    const occupant = board.getPieceAt(squareId);

    return (
      occupant !== undefined &&
      occupant.type === PieceType.KING &&
      occupant.color !== color &&
      board.isPieceActive(occupant.id)
    );
  }

  /**
   * Determines whether `kingColor`'s king is currently in check by any
   * opposing piece.
   *
   * This is a narrower, faster alternative to computing a full
   * attacker/target map for callers that only need a yes/no answer for a
   * single king — notably {@link RuleSet.isMoveLegal}, which calls this
   * once per candidate move being tested and benefits from an early-exit
   * check, and {@link RuleSet.getCheckedKings}, which calls this once per
   * color.
   *
   * @param board - The board to evaluate.
   * @param kingColor - The color whose king should be checked.
   */
  protected abstract isKingInCheck(board: Board, kingColor: Color): boolean;

  /**
   * Determines whether a candidate move is legal for `color` — i.e.
   * whether applying it would leave `color`'s own king in check by any
   * opposing piece.
   *
   * The move is tried on a fresh clone of `board` for each call, so that
   * evaluating one candidate never leaks side effects into the next.
   */
  private isMoveLegal(move: Move, color: Color, board: Board): boolean {
    const boardClone = board.clone();

    this.applyMoveOnBoard(move, boardClone);

    return !this.isKingInCheck(boardClone, color);
  }

  /**
   * Expands a pawn's list of pseudo-legal moves with any applicable
   * special pawn moves (double-step, promotion), tagging the
   * relevant `Move` objects' `pawnSpecialMove` field accordingly.
   *
   * @param pawn - The pawn being evaluated.
   * @param from - The pawn's current square id.
   * @param game - The game providing board/history context.
   * @param moves - The pawn's pseudo-legal moves so far.
   * @returns The expanded move list.
   */
  protected abstract withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[];

  /**
   * Determines whether a given pawn is currently eligible to advance two
   * squares (its double-step move).
   */
  protected abstract canDoubleSteps(pawn: Piece, from: number): boolean;
  
  /**
   * Computes the currently available castling moves for a given player,
   * accounting for whether the king/rooks have moved, whether the path is
   * clear, and any check-related restrictions.
   *
   * @param player - The color to compute castling moves for.
   * @param game - The game providing board/history context.
   */
  abstract getCastleMoves(player: Color, game: Game): Move[];

  /**
   * Computes all promotion moves currently available to `pawn` from
   * `from` — i.e. every pseudo-legal destination (straight push or
   * diagonal capture) that crosses the board's promotion threshold for
   * that pawn's color, each tagged as a `"promotion"` special move.
   *
   * @param pawn - The pawn to evaluate.
   * @param from - The pawn's current square id.
   * @param board - The board to evaluate against.
   * @returns All available promotion moves (possibly empty, if `pawn` is
   * not currently positioned to promote).
   */
  abstract getPromotionMoves(pawn: Piece, from: number, board: Board): Move[];

  /** Recomputes and updates derived game state (player states, status, etc.). */
  abstract updateGameState(game: Game): void;

  /** Determines whether the game is a draw under the 50-move rule. */
  abstract isDrawBy50MovesRule(game: Game): boolean;

  /** Determines whether the game is a draw due to insufficient material. */
  abstract isDrawByInsufficientMaterial(game: Game): boolean;
  
  /**
   * @returns The colors of all currently active (non-eliminated) players.
   */
  protected getActivePlayers(game: Game): Color[] {
    return RuleSet.PLAYER_COLORS.filter(color =>
      game.isPlayerActive(color)
    );
  }

  /**
   * Allows a player to claim victory and end the game early when exactly
   * two active players remain and they hold a decisive lead.
   *
   * The claim succeeds only if:
   * - Exactly two active players remain in the game.
   * - `player`'s score exceeds the other active player's score by more
   *   than 20 points — chosen so that awarding the standard 20
   *   resignation points to the opponent can never change the eventual
   *   winner.
   *
   * On success, `player` is resigned (ending the game for them), the
   * other player is awarded the standard 20 resignation points, and
   * {@link RuleSet.endGame} is invoked.
   *
   * @param player - The color claiming victory.
   * @param game - The game to potentially end.
   * @returns `true` if the claim was valid and the game was ended;
   * `false` otherwise (no state is changed in that case).
   */
  public claimVictory(player: Color, game: Game): boolean {
    const activePlayers = this.getActivePlayers(game);

    if (activePlayers.length !== 2)
      return false;

    const otherPlayer = activePlayers.find(color => color !== player)!;

    const playerScore = game.getPlayer(player).getScore();
    const otherPlayerScore = game.getPlayer(otherPlayer).getScore();

    if (playerScore - otherPlayerScore <= 20)
      return false;

    game.resignPlayer(player);

    this.awardPlayerPoints(otherPlayer, 20, game);

    this.endGame(game);

    return true;
  }

  /**
   * Awards points to a player's score. Exists as a single extension point
   * for subclasses that may need to layer extra bookkeeping onto point
   * awarding in the future.
   */
  protected awardPlayerPoints(
      color: Color,
      points: number,
      game: Game
  ): void {
      game.incrementPlayerScore(color, points);
  }
  
  /**
   * Determines whether a player has **no legal moves at all** across any
   * of their pieces.
   *
   * ⚠️ Despite the name, this does not by itself distinguish checkmate
   * from stalemate — it is a generic "no legal moves exist" check.
   * Combine with {@link RuleSet.getCheckedKings} to determine which
   * condition applies.
   *
   * Stops at the first piece found to have a legal move (and, within
   * that piece, at the first legal move found — see
   * {@link RuleSet.hasLegalMove}), rather than exhaustively computing
   * every piece's complete legal-move list.
   *
   * @param player - The color to evaluate.
   * @param game - The game to evaluate.
   */
  public isPlayerMate(player: Color, game: Game): boolean {
    const board = game.getBoard();
    const pieces = board.getPiecesByColor(player);

    return !pieces.some(piece => this.hasLegalMove(piece.id, game));
  }

  /**
   * Determines whether a piece currently has at least one legal move,
   * without computing the full list of legal moves.
   *
   * Reuses the exact same candidate-generation pipeline as
   * {@link RuleSet.getLegalMoves} (via {@link RuleSet.generateCandidateMoves}),
   * but stops as soon as a single legal candidate is found via
   * `Array.prototype.some`, rather than evaluating and collecting every
   * candidate. Used by {@link RuleSet.isPlayerMate} to avoid the cost of
   * fully enumerating legal moves for every piece just to answer a
   * yes/no question.
   *
   * @param pieceId - The id of the piece to check.
   * @param game - The game providing board and player-state context.
   */
  private hasLegalMove(pieceId: string, game: Game): boolean {
    const board = game.getBoard() as Board;
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return false;

    if (
      game.isPlayerCheckMated(selectedPiece.color) ||
      game.isPlayerStalled(selectedPiece.color)
    ) {
      return false;
    }

    const candidates = this.generateCandidateMoves(selectedPiece, board, game);

    return candidates.some(move =>
      this.isMoveLegal(move, selectedPiece.color, board)
    );
  }

  /**
   * Identifies which color is **causally responsible** for `checkedColor`
   * being checkmated, distinguishing genuine authorship of the mate from
   * merely attacking the king geometrically at the moment mate is
   * detected (see the class-level discussion of discovered checks for why
   * these can differ in a four-player context).
   *
   * @remarks
   * This method trusts `checkedColor`'s {@link PlayerStatus.checkmated} flag
   * only as a trigger to run analysis, not as ground truth: it independently
   * verifies the king is actually in check on the current board before
   * attempting any causal attribution, returning `undefined` otherwise. This
   * guards against a `CHECKMATE` state applied without a genuine underlying
   * check — e.g., a player eliminated by means other than an actual board
   * checkmate — which would otherwise cause the window-based fallback to
   * spuriously blame whichever color moved most recently.
   *
   * `checkedColor` can only be evaluated for checkmate on their own turn
   * (see {@link RuleSet.updateGameState}), by which point up to three
   * other players may have moved since `checkedColor`'s own last move.
   * Responsibility is resolved by testing each of those half-moves, from
   * most recent to oldest: a move is deemed responsible if **omitting it
   * alone** (while keeping every other move in the window applied, via a
   * counterfactual replay built with {@link RuleSet.undoMoveOnBoard} /
   * {@link RuleSet.applyMoveOnBoard}) would mean `checkedColor` is no
   * longer both in check and without any legal move.
   *
   * If the mate turns out to be "overdetermined" — i.e. no single window
   * move's omission breaks it — responsibility defaults to the most
   * recent move in the window.
   *
   * @param checkedColor - The color that has just been determined to be
   * checkmated.
   * @param game - The game to evaluate.
   * @returns The color responsible for the mate, or `undefined` if
   * `checkedColor`'s king is not actually in check on the current board, or
   * has no prior move in history at all.
   */
  protected findCheckmateArchitect(checkedColor: Color, game: Game): Color | undefined {
    if (!this.isKingInCheck(game.getBoard() as Board, checkedColor)) return undefined;

    const history = game.getHistory();
    const windowStart = this.findLastMoveIndexOf(checkedColor, history, game) + 1;
    const window = history.slice(windowStart);

    if (window.length === 0) return undefined;

    for (let i = window.length - 1; i >= 0; i--) {
      if (window[i].check && !this.isStillMatedWithoutMove(checkedColor, game, window, i)) {
        return this.resolveMoveColor(window[i], game);
      }
    }

    return this.resolveMoveColor(window[window.length - 1], game);
  }

  /**
   * Finds the index in `history` of `color`'s most recent move.
   *
   * @returns The index, or `-1` if `color` has no move in `history`.
   */
  private findLastMoveIndexOf(color: Color, history: Move[], game: Game): number {
    for (let i = history.length - 1; i >= 0; i--) {
      if (this.resolveMoveColor(history[i], game) === color) return i;
    }

    return -1;
  }

  /**
   * Resolves the color of the piece that made a historical move, whether
   * or not that piece has since been captured.
   */
  private resolveMoveColor(move: Move, game: Game): Color {
    return (
      game.getBoard().getPiece(move.pieceId)?.color ??
      game.getCapturedPiece(move.pieceId)!.color
    );
  }

  /**
   * Tests the counterfactual "what if `window[skip]` had never been
   * played?" by reconstructing the board immediately before `window[skip]`
   * (via {@link RuleSet.undoMoveOnBoard}, undoing every window move from
   * the most recent back through `skip`), then reapplying every window
   * move **after** `skip` in order — recomputing captures fresh against
   * the altered board at each step.
   *
   * @returns Whether `checkedColor` would still be both in check and
   * without any legal move in the resulting position.
   */
  private isStillMatedWithoutMove(
    checkedColor: Color,
    game: Game,
    window: Move[],
    skip: number
  ): boolean {
    const board = (game.getBoard() as Board).clone();

    for (let i = window.length - 1; i >= skip; i--) {
      this.undoMoveOnBoard(window[i], board, game);
    }

    for (let i = skip + 1; i < window.length; i++) {
      this.applyMoveOnBoard(window[i], board);
    }

    if (!this.isKingInCheck(board, checkedColor)) return false;

    const scratchGame = new Game(this, board.exportPieces());
    // Ensures castling remains correctly forbidden out of check in the
    // reconstructed position (getCastleMoves gates on Game.isPlayerInCheck
    // rather than re-deriving it from the board).
    scratchGame.setPlayerInCheck(checkedColor, true);

    return this.isPlayerMate(checkedColor, scratchGame);
  }

  /**
   * Determines whether the current position has occurred at least three
   * times, based on {@link RuleSet.computePositionKey}.
   */
  public isDrawByTripleRepetition(game: Game): boolean {
    return game.getCurrentPositionCount() >= 3;
  }
}