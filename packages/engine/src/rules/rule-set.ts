import { Board } from "../board";
import { Game } from "../game";
import { Move, MoveGenerator } from "../moves";
import { enPassantCapturedPawnSquare } from "../moves/pawn-moves";
import { rookCastleDirectionOffset } from "../moves/rook-moves";
import { CapturedPiece, Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { pickRandomElement } from "../utils/utils";

/**
 * Base rules engine for a four-player chess variant.
 *
 * `RuleSet` follows a **template method** pattern: it owns the shared
 * orchestration logic that is the same regardless of variant specifics —
 * applying moves to a {@link Board}, recording history on a {@link Game},
 * filtering pseudo-legal moves down to truly legal ones (i.e. moves that
 * don't leave the mover's own king in check), and computing repetition
 * keys for draw detection — while delegating variant-specific rules
 * (castling availability, en passant availability, promotion, check
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
   */
  public applyMove(move: Move, game: Game): boolean {
    if (game.isOver()) return false;
    
    const [appliedMove, capturedPiece]: 
      [Move | undefined, CapturedPiece | undefined]
        = this.applyMoveOnBoard(move, game.getBoard());
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
    this.recordMove(appliedMove, movedPiece.color, game);

    return true;
  }

  /**
   * Advances the game by a single player's turn, handling three distinct
   * situations depending on the current player's status:
   *
   * 1. **Active player**: `move` must be provided and must belong to a
   *    piece owned by the current player. The current position is
   *    recorded for repetition-detection purposes (counted *before* the
   *    move is applied), the move is applied via {@link RuleSet.applyMove},
   *    and the turn advances to the **next** player *before*
   *    {@link RuleSet.applyRulesPostMove} runs — so that post-move rule
   *    processing (e.g. checkmate/stalemate detection) evaluates the
   *    player who is now to move, matching standard chess semantics
   *    ("is the side to move currently mated?").
   * 2. **Resigned or timed-out player**: no `move` is expected from the
   *    caller. If the player has no legal moves at all
   *    ({@link RuleSet.isPlayerMate}), only the move clock is incremented.
   *    Otherwise, a random legal king move is chosen and applied on their
   *    behalf via {@link RuleSet.applyMove}. In either case,
   *    {@link RuleSet.applyRulesPostMove} runs *before* the turn advances,
   *    so that mate/stalemate detection is evaluated for this same
   *    resigned/timed-out player — allowing a future call to this method
   *    to recognize once they've become fully mated and stop wasting
   *    random king moves on them.
   * 3. **Otherwise inactive player** (e.g. eliminated by other means):
   *    only the move clock is incremented; no move is played. As with (2),
   *    post-move rules run before the turn advances.
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
      game.incrementPositionCount(
        this.computePositionKey(game)
      );
      if (!this.applyMove(move, game)) return false;

      game.advanceCurrentPlayer();
      this.applyRulesPostMove(game);

      return true;
    } else if (game.isPlayerResignedOrTimedOut(currentPlayer)) {
      if (this.isPlayerMate(currentPlayer, game)) {
        game.incrementMoveClock();
      } else {
        const kingMove = this.chooseRandomKingMove(currentPlayer, game);

        if (kingMove) {
          this.applyMove(kingMove, game);
        } else {
          game.incrementMoveClock();
        }
      }
    } else {
      game.incrementMoveClock();
    }

    this.applyRulesPostMove(game);
    game.advanceCurrentPlayer();

    return true;
  }
  
  /**
   * Applies a move directly onto a board, handling all special-move
   * bookkeeping (direct capture, en passant, promotion, castling rook
   * movement) and physically relocating the piece.
   *
   * Capture resolution order: a direct capture (piece already occupying
   * `move.to`) is detected first; if the move is instead an en passant
   * capture, that takes precedence for the returned captured piece. A
   * move can only result from **one** of these two capture types, never
   * both.
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

    let directCapturedId = appliedMove.capture;
    let enPassantCapturedId: string | undefined = undefined;

    [appliedMove, enPassantCapturedId] = 
      this.applyEnPassant(appliedMove, board);

    this.applyPromotion(appliedMove, board);
    this.applyCastling(move, board);

    /* Piece captured is either from en-passant 
    /* or direct capture but never both */
    const capturedPieceId = directCapturedId ?? enPassantCapturedId;

    const capturedPiece =
      capturedPieceId !== undefined
        ? board.getPiece(capturedPieceId)!
        : undefined;

    const movedPiece = board.placePiece(move.pieceId, move.to);

    if (!movedPiece) return [undefined, undefined];

    if(!capturedPiece) return [appliedMove, capturedPiece];

    if (enPassantCapturedId !== undefined)
      board.removePiece(enPassantCapturedId);

    return [
      appliedMove, {
        ...capturedPiece!, 
        capturedBy: movedPiece.color
      }
    ];
  }

  /**
   * Enriches a move with `capture` if a piece already occupies the
   * destination square (i.e. a standard, non-en-passant capture).
   */
  private withDirectCapture(move: Move, board: Board): Move {
    const capturedPiece = board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  /**
   * Enriches a move with `capture` if it represents an en passant capture,
   * resolving the id of the captured pawn (which does not occupy the
   * move's destination square).
   *
   * @returns A tuple of the (possibly enriched) move and the captured
   * pawn's id, or `undefined` if this is not a valid en passant capture.
   */
  private applyEnPassant(
    move: Move, 
    board: Board)
    : [Move, string | undefined] {
    const capturedPieceId = this.getCapturedPieceIdForEnPassant(move, board);
    if (!capturedPieceId) return [move, undefined];

    return [{ ...move, capture: capturedPieceId }, capturedPieceId];
  }

  /**
   * Resolves the id of the pawn captured by an en passant move, or
   * `undefined` if the move is not a valid en passant capture (wrong
   * special-move flag, piece isn't a pawn, target square empty, or the
   * piece there is the same color as the mover).
   */
  private getCapturedPieceIdForEnPassant(
    move: Move,
    board: Board
  ): string | undefined {
    if (move.pawnSpecialMove !== "e-p") return undefined;

    const movingPiece = board.getPiece(move.pieceId);
    if (!movingPiece || movingPiece.type !== PieceType.PAWN) return undefined;

    const capturedSquare = enPassantCapturedPawnSquare(move.to, movingPiece.color);
    const capturedPiece = board.getPieceAt(capturedSquare);
    if (!capturedPiece || capturedPiece.color === movingPiece.color) return undefined;

    return capturedPiece.id;
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
   * Records a move into the game's history, attaching an annotation of
   * which opponent king(s), if any, the move puts in check — analogous to
   * the `+`/`#` suffix in standard algebraic notation.
   *
   * @param move - The applied move to record.
   * @param color - The color of the piece that was moved (used to look up
   * checks delivered *by* this color's pieces, not checks *against* it).
   * @param game - The game whose history should be updated.
   */
  private recordMove(move: Move, color: Color, game: Game): void {
    const checkInfos = this.getCheckInfos(color, game);

    game.addMoveToHistory(
      checkInfos.size > 0
        ? { ...move, check: checkInfos }
        : move
    );
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
   * state, the player to move, remaining castling rights, and available
   * en passant targets — analogous in purpose to a FEN's position fields.
   *
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
    const enPassantTargets: string[] = [];

    for (const piece of board.getPiecesByColor(currentPlayer)) {
      if (piece.type === PieceType.PAWN) {
        const from = board.getPositionOf(piece.id)!;
        const moves = this.getEnPassantMoves(piece, from, game);

        if (!moves) continue;

        for (const move of moves) {
          enPassantTargets.push(
            move.pieceId + ',' + move.to.toString()
          );
        }
      }
    }

    castlingRights.sort();
    enPassantTargets.sort();

    return [
      board.toString(),
      currentPlayer,
      `castling=${castlingRights.length > 0
        ? castlingRights.join(";")
        : "none"}`,
      `ep=${enPassantTargets.length > 0
        ? enPassantTargets.join(";")
        : "none"}`
    ].join("\n");
  }

  /**
   * Hook invoked after a move (or a skipped/auto-played turn) has been
   * processed, giving subclasses a chance to update derived game state —
   * typically recomputing each player's {@link PlayerState} (check,
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
   * Determines which checks are currently being delivered **by** the
   * pieces belonging to the given attacking player(s), against any
   * opposing king(s) — regardless of whether those opponents are included
   * in `players`.
   *
   * A piece never counts as checking its own color's king.
   *
   * @param board - The board to evaluate.
   * @param players - The colors whose pieces should be considered as
   * potential attackers. Pass all four colors (e.g.
   * `RuleSet.PLAYER_COLORS`) to compute the complete set of checks present
   * in a position, or a single color to compute only the checks delivered
   * by that player's pieces (see {@link RuleSet.getCheckInfos}).
   * @returns A map from an **attacking piece's id** to the list of
   * opponent king-colors that piece is currently checking. Pieces that
   * are not delivering any check are omitted entirely.
   */
  protected abstract getActiveChecks(
    board: Board,
    players: Iterable<Color>
  ): Map<string, Color[]>;

  /**
   * Convenience wrapper around {@link RuleSet.getActiveChecks} restricted
   * to a single attacking player.
   *
   * @param player - The color whose pieces should be considered as
   * potential attackers.
   * @param game - The game to evaluate.
   * @returns A map from one of `player`'s piece ids to the opponent
   * king-color(s) it is currently checking (empty if `player` is
   * delivering no checks at all).
   */
  public getCheckInfos(player: Color, game: Game): Map<string, Color[]> {
    return this.getActiveChecks(game.getBoard(), [player]);
  }
  
  /**
   * Computes all fully legal moves for a given piece — i.e. pseudo-legal
   * moves (from {@link MoveGenerator}), expanded with any applicable
   * special pawn moves or castling moves, then filtered to exclude any
   * move that would leave the mover's own king in check.
   *
   * Returns an empty array if the piece doesn't exist, or if its owning
   * player is already checkmated or stalemated.
   *
   * @param pieceId - The id of the piece to compute legal moves for.
   * @param game - The game providing board and player-state context.
   * @returns All legal moves available to the piece.
   */
  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = game.getBoard();
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return [];

    const from = board.getPositionOf(pieceId)!;

    if (
      game.isPlayerCheckMated(selectedPiece.color) ||
      game.isPlayerStalled(selectedPiece.color)
    ) {
      return [];
    }

    const pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(selectedPiece, board);
    if (pseudoLegalMoves.length === 0) return [];

    let moves = pseudoLegalMoves.map(to =>
      this.moveGenerator.buildMove(pieceId, from, to)
    );

    if (selectedPiece.type === PieceType.PAWN) {
      moves = this.withPawnSpecialMoves(selectedPiece, from, game, moves);
    }

    if (selectedPiece.type === PieceType.KING) {
      moves.push(...this.getCastleMoves(selectedPiece.color, game));
    }

    moves = moves.filter(move =>
      this.isMoveLegal(move, selectedPiece.color, board)
    );

    return moves;
  }

  /**
   * Determines whether a candidate move is legal for `color` — i.e.
   * whether applying it would leave `color`'s own king in check by
   * **any** opposing piece.
   *
   * The move is tried on a **fresh clone** of `board` for each call, so
   * that evaluating one candidate never leaks side effects (captures,
   * piece removal, etc.) into the evaluation of another candidate. All
   * four colors are passed as potential attackers to
   * {@link RuleSet.getActiveChecks} so that checks delivered by any
   * player are accounted for.
   */
  private isMoveLegal(
      move: Move,
      color: Color,
      board: Board
  ): boolean {
    // Each candidate move must be tried on its own fresh clone of the
    // original position. Reusing a single mutated clone across multiple
    // candidate moves (as this used to do) leaks the side effects of one
    // candidate (captures, piece removals, etc.) into the legality check
    // of the next candidate, producing false positives/negatives.
    const boardClone = board.clone();

    this.applyMoveOnBoard(move, boardClone);

    const checks = this.getActiveChecks(
        boardClone,
        RuleSet.PLAYER_COLORS
    );

    return ![...checks.values()].some(colors => colors.includes(color));
  }

  /**
   * Expands a pawn's list of pseudo-legal moves with any applicable
   * special pawn moves (double-step, en passant, promotion), tagging the
   * relevant `Move` objects' `pawnSpecialMove` field accordingly.
   *
   * @param pawn - The pawn being evaluated.
   * @param from - The pawn's current square id.
   * @param game - The game providing board/history context (e.g. for
   * determining en passant eligibility).
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
   * Computes the currently available en passant capture(s) for a given
   * pawn, if any.
   *
   * @param pawn - The pawn to evaluate.
   * @param from - The pawn's current square id.
   * @param game - The game providing board/history context (en passant
   * eligibility typically depends on the immediately preceding move).
   * @returns An array of en passant moves, or `undefined` if none apply.
   */
  abstract getEnPassantMoves(pawn: Piece, from: number, game: Game): Move[] | undefined;

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
    // A player may only claim victory when exactly two active players remain.
    const activePlayers = this.getActivePlayers(game);

    if (activePlayers.length !== 2)
      return false;

    const otherPlayer = activePlayers.find(color => color !== player)!;

    const playerScore = game.getPlayer(player).getScore();
    const otherPlayerScore = game.getPlayer(otherPlayer).getScore();

    // The claim is only valid if the leading player is ahead by at least
    // 21 points. Awarding 20 points to the opponent can therefore never
    // change the final winner.
    if (playerScore - otherPlayerScore <= 20)
      return false;

    // End the game immediately by eliminating the claimant.
    game.resignPlayer(player);

    // The remaining player receives the standard 20 resignation points.
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
   * Combine with {@link RuleSet.getCheckInfos} to determine which
   * condition applies.
   *
   * @param player - The color to evaluate.
   * @param game - The game to evaluate.
   */
  public isPlayerMate(player: Color, game: Game): boolean {
    const board = game.getBoard();
    const pieces = board.getPiecesByColor(player);

    for (const piece of pieces) {
      if (this.getLegalMoves(piece.id, game).length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines whether the current position has occurred at least three
   * times, based on {@link RuleSet.computePositionKey}.
   */
  public isDrawByTripleRepetition(game: Game): boolean {
    return game.getPositionCount(
      this.computePositionKey(game)
    ) >= 3;
  }
}