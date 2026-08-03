import { Board } from "../board";
import { Game, getMutableBoard, getMutableGameInternals } from "../game";
import { Move, MoveGenerator } from "../moves";
import { rookCastleDirectionOffset } from "../moves/rook-moves";
import { CapturedPiece, Color, GameStatus, Piece, PieceType } from "../types";
import { pickRandomElement, rookInitialSquareId } from "../utils/utils";

/**
 * Base rules engine for a four-player chess variant.
 *
 * `RuleSet` follows a **template method** pattern: it owns the shared
 * orchestration logic that is the same regardless of variant specifics —
 * validating and applying moves to a {@link Board}, recording history on
 * a {@link Game}, filtering pseudo-legal moves down to truly legal ones
 * (i.e. moves that don't leave the mover's own king in check), and
 * computing repetition keys for draw detection — while delegating
 * variant-specific rules (castling availability, promotion, check
 * detection, endgame conditions, and 50-move/insufficient-material draw
 * detection) to concrete subclasses via `abstract` methods.
 *
 * ### Trust boundary
 * {@link RuleSet.applyMove} is the sole entry point through which a move
 * actually gets applied during normal play, and it never trusts its
 * caller: it independently re-derives the mover's legal moves (see
 * {@link RuleSet.getLegalMoves}) and applies the matching canonical move
 * it computed itself, rather than the caller-supplied object — so a
 * caller cannot smuggle in a forged field (e.g. a fake `capture` or
 * `castle`) piggybacking on an otherwise-legal `{pieceId, from, to}`.
 * {@link RuleSet.advanceTurn} additionally enforces turn ownership before
 * ever reaching `applyMove`.
 *
 * Beyond move legality, `RuleSet` is also the only component with real
 * mutation access to a `Game`'s board and internal bookkeeping, via the
 * module-private {@link getMutableBoard} / {@link getMutableGameInternals}
 * registries in `game/game.ts` — neither is reachable from outside
 * `@chess4/engine`. The one deliberate exception to the "always
 * re-validate legality" rule is {@link RuleSet.applyMoveOnBoard} /
 * {@link RuleSet.undoMoveOnBoard}, used exclusively by
 * {@link RuleSet.findCheckmateArchitect}'s counterfactual replay — those
 * operate on moves already known to have been legal when originally
 * played, against a deliberately hypothetical board, so re-validating
 * legality "as of now" would be incorrect there, not just redundant.
 *
 * Concrete subclasses are expected to implement all abstract members
 * declared below to produce a fully working rules engine.
 */
export abstract class RuleSet {

  /** The four player colors, in canonical turn order. */
  protected static PLAYER_COLORS = [
    Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN
  ];

  constructor(
    protected readonly moveGenerator: MoveGenerator
  ) {}

  public advanceTurn(game: Game, move?: Move): boolean {
    if (game.isOver()) return false;

    const currentPlayer = game.getCurrentPlayerColor();

    if (game.isPlayerActive(currentPlayer)) {
      if (!move) return false;

      const movedPiece = game.getBoard().getPiece(move.pieceId);
      if (!movedPiece || movedPiece.color !== currentPlayer) return false;

      getMutableGameInternals(game).incrementPositionCount(this.computePositionKey(game));
      if (!this.applyMove(move, game)) return false;

      getMutableGameInternals(game).advanceCurrentPlayer();
    } else {
      const hasKingMoved = this.autoPlayOrSkip(currentPlayer, game);
      if (hasKingMoved) getMutableGameInternals(game).advanceCurrentPlayer();
    }

    this.settleUpcomingTurns(game);

    return true;
  }

  private settleUpcomingTurns(game: Game): void {
    let guard = 0;

    while (guard < RuleSet.PLAYER_COLORS.length) {
      this.applyRulesPostMove(game);

      if (game.isOver()) return;

      const current = game.getCurrentPlayerColor();
      if (game.isPlayerActive(current)) return;

      this.autoPlayOrSkip(current, game);
      getMutableGameInternals(game).advanceCurrentPlayer();
      guard += 1;
    }
  }

  private autoPlayOrSkip(color: Color, game: Game): boolean {
    if (game.isPlayerResignedOrTimedOut(color)) {
      const kingMove = this.chooseRandomKingMove(color, game);
      if (kingMove) {
        this.applyMove(kingMove, game);
        return true;
      }
    }

    getMutableGameInternals(game).incrementMoveClock();
    return false;
  }

  /**
   * Applies a move to the game's board and records its effects (captured
   * piece, moved-piece tracking for castling-rights purposes, and
   * post-move check annotations) into the game's history.
   *
   * `move` is validated against the mover's actual legal moves (see
   * {@link RuleSet.getLegalMoves}) before anything is applied; if no
   * legal move matches, the game is left untouched. The canonical legal
   * move — not the caller-supplied object — is what actually gets
   * applied, so a caller cannot smuggle in a forged field on an
   * otherwise-legal `{pieceId, from, to}`.
   *
   * This method does **not** advance the turn to the next player; see
   * {@link RuleSet.advanceTurn} for that.
   *
   * @returns `true` if the move was applied successfully; `false` if the
   * game is already over, the piece no longer exists on the board, or
   * `move` does not match any currently legal move for that piece.
   */
  public applyMove(move: Move, game: Game): boolean {
    if (game.isOver()) return false;

    const board = getMutableBoard(game);
    const movedPiece = board.getPiece(move.pieceId);
    if (!movedPiece) return false;

    const canonicalMove = this.getLegalMoves(move.pieceId, game).find(candidate =>
      candidate.to === move.to &&
      candidate.from === move.from &&
      candidate.castle === move.castle &&
      candidate.pawnSpecialMove === move.pawnSpecialMove
    );
    if (!canonicalMove) return false;

    const [appliedMove, capturedPiece]:
      [Move | undefined, CapturedPiece | undefined]
        = this.applyMoveOnBoard(canonicalMove, board);
    if (!appliedMove) return false;

    const internals = getMutableGameInternals(game);

    if (capturedPiece) {
      internals.addCapturedPiece(capturedPiece.id, capturedPiece);
    }
    const movedPieceAfter = board.getPiece(appliedMove.pieceId)!;

    internals.addMovedPiece(appliedMove.pieceId);
    if (move.castle) {
      const color = movedPieceAfter.color;
      internals.addMovedPiece(`R-${color}-${move.castle}`);
    }
    this.recordMove(appliedMove, game);

    return true;
  }

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

  private withDirectCapture(move: Move, board: Board): Move {
    const capturedPiece = board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  private applyPromotion(move: Move, board: Board): void {
    if (move.pawnSpecialMove === "promotion") {
      board.setPromotionPieceType(move.pieceId, PieceType.QUEEN);
    }
  }

  private applyCastling(move: Move, board: Board): void {
    if (!move.castle) return;

    const color = board.getPiece(move.pieceId)!.color;
    const rookId = `R-${color}-${move.castle}`;

    board.placePiece(
      rookId,
      move.to + rookCastleDirectionOffset(color, move.castle)
    );
  }

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

  /**
   * Records a move into the game's history, attaching an annotation of
   * which king(s) are, as a direct causal consequence of this move, in
   * check — see {@link isCheckCausedByMove}.
   */
  private recordMove(move: Move, game: Game): void {
    const checkedAfter = this.getCheckedKings(getMutableBoard(game));

    const newlyChecked = RuleSet.PLAYER_COLORS.filter(color =>
      checkedAfter.has(color) && this.isCheckCausedByMove(color, move, game)
    );

    getMutableGameInternals(game).addMoveToHistory(
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
   * @param move - The just-applied move, not yet present in `game`'s
   * history.
   * @param game - The game providing board/history context.
   */
  private isCheckCausedByMove(checkedColor: Color, move: Move, game: Game): boolean {
    const history = game.getHistory();
    const windowStart = this.findLastMoveIndexOf(checkedColor, history, game) + 1;
    const window = history.slice(windowStart);

    if (window.length === 0) return true;

    const board = getMutableBoard(game).clone();

    this.undoMoveOnBoard(move, board, game);
    for (let i = window.length - 1; i >= 0; i -= 1) {
      this.undoMoveOnBoard(window[i], board, game);
    }

    this.applyMoveOnBoard(move, board);

    return this.isKingInCheck(board, checkedColor);
  }

  protected getCheckedKings(board: Board): Set<Color> {
    const checked = new Set<Color>();

    for (const color of RuleSet.PLAYER_COLORS) {
      if (this.isKingInCheck(board, color)) checked.add(color);
    }

    return checked;
  }

  private chooseRandomKingMove(color: Color, game: Game): Move | undefined {
    const kingMoves = this.getLegalMoves(`K-${color}`, game);
    if (kingMoves.length === 0) return undefined;

    return pickRandomElement(kingMoves);
  }

  protected isDraw(game: Game): boolean {
    return (this.isDrawByTripleRepetition(game) ||
      this.isDrawBy50MovesRule(game) ||
      this.isDrawByInsufficientMaterial(game)
    )
  }

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

  protected abstract applyRulesPostMove(game: Game): void;

  abstract endGame(game: Game): void;

  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = getMutableBoard(game);
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

  protected abstract isKingInCheck(board: Board, kingColor: Color): boolean;

  private isMoveLegal(move: Move, color: Color, board: Board): boolean {
    const boardClone = board.clone();

    this.applyMoveOnBoard(move, boardClone);

    return !this.isKingInCheck(boardClone, color);
  }

  protected abstract withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[];

  protected abstract canDoubleSteps(pawn: Piece, from: number): boolean;

  abstract getCastleMoves(player: Color, game: Game): Move[];

  abstract getPromotionMoves(pawn: Piece, from: number, board: Board): Move[];

  abstract updateGameState(game: Game): void;

  abstract isDrawBy50MovesRule(game: Game): boolean;

  abstract isDrawByInsufficientMaterial(game: Game): boolean;

  protected getActivePlayers(game: Game): Color[] {
    return RuleSet.PLAYER_COLORS.filter(color =>
      game.isPlayerActive(color)
    );
  }

  public claimVictory(player: Color, game: Game): boolean {
    const activePlayers = this.getActivePlayers(game);

    if (activePlayers.length !== 2)
      return false;

    const otherPlayer = activePlayers.find(color => color !== player)!;

    const playerScore = game.getPlayer(player).getScore();
    const otherPlayerScore = game.getPlayer(otherPlayer).getScore();

    if (playerScore - otherPlayerScore <= 20)
      return false;

    this.resignPlayer(player, game);

    this.awardPlayerPoints(otherPlayer, 20, game);

    this.endGame(game);

    return true;
  }

  /**
   * Marks a player as resigned and deactivates all of their pieces
   * except the king, which is deliberately left active so it can
   * continue to be auto-played (see `autoPlayOrSkip`) for as long as it
   * has legal moves — only once it runs out of legal moves does
   * {@link DefaultRuleSet.updatePlayerPiecesStatus} deactivate it too.
   * This is the sanctioned path for a resignation to take effect —
   * {@link Game.resignPlayer} does nothing but delegate here.
   *
   * @param color - The player resigning.
   * @param game - The game to update.
   */
  public resignPlayer(color: Color, game: Game): void {
    getMutableGameInternals(game).setPlayerResigned(color);
    getMutableBoard(game).setPlayerPiecesInactive(color, true);
  }

  /**
   * Marks a player as timed out and deactivates all of their pieces
   * except the king. Mirrors {@link RuleSet.resignPlayer} for the
   * timeout forfeit case.
   */
  public timeOutPlayer(color: Color, game: Game): void {
    getMutableGameInternals(game).setPlayerTimedOut(color);
    getMutableBoard(game).setPlayerPiecesInactive(color, true);
  }

  protected awardPlayerPoints(
    color: Color,
    points: number,
    game: Game
  ): void {
    getMutableGameInternals(game).incrementPlayerScore(color, points);
  }

  public isPlayerMate(player: Color, game: Game): boolean {
    const board = game.getBoard();
    const pieces = board.getPiecesByColor(player);

    return !pieces.some(piece => this.hasLegalMove(piece.id, game));
  }

  private hasLegalMove(pieceId: string, game: Game): boolean {
    const board = getMutableBoard(game);
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

  protected findCheckmateArchitect(checkedColor: Color, game: Game): Color | undefined {
    if (!this.isKingInCheck(getMutableBoard(game), checkedColor)) return undefined;

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

  private findLastMoveIndexOf(color: Color, history: Move[], game: Game): number {
    for (let i = history.length - 1; i >= 0; i--) {
      if (this.resolveMoveColor(history[i], game) === color) return i;
    }

    return -1;
  }

  private resolveMoveColor(move: Move, game: Game): Color {
    return (
      game.getBoard().getPiece(move.pieceId)?.color ??
      game.getCapturedPiece(move.pieceId)!.color
    );
  }

  private isStillMatedWithoutMove(
    checkedColor: Color,
    game: Game,
    window: Move[],
    skip: number
  ): boolean {
    const board = getMutableBoard(game).clone();

    for (let i = window.length - 1; i >= skip; i--) {
      this.undoMoveOnBoard(window[i], board, game);
    }

    for (let i = skip + 1; i < window.length; i++) {
      this.applyMoveOnBoard(window[i], board);
    }

    if (!this.isKingInCheck(board, checkedColor)) return false;

    const scratchGame = new Game(this, board.exportPieces());
    getMutableGameInternals(scratchGame).setPlayerInCheck(checkedColor, true);

    return this.isPlayerMate(checkedColor, scratchGame);
  }

  public isDrawByTripleRepetition(game: Game): boolean {
    return game.getCurrentPositionCount() >= 3;
  }
}