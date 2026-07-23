import { Board } from "../board";
import { Game } from "../game";
import { Move, MoveGenerator } from "../moves";
import { castleDirectionOffset } from "../moves/king-moves";
import { forwardDirection, pawnMoves } from "../moves/pawn-moves";
import { Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { kingInitialSquareId, rookInitialSquareId } from "../utils/utils";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { RuleSet } from "./rule-set";

/**
 * Concrete {@link RuleSet} implementing the "free-for-all" four-player
 * chess variant: all four players compete independently, aiming to
 * checkmate or eliminate opponents while accumulating points through
 * captures, multi-king checks, and mate-related bonuses.
 *
 * ### Scoring summary
 * - **Capture**: the capturing player receives the captured piece's
 *   standard point value (pawn=1, knight/bishop=3, rook=5, queen=9; the
 *   king has no point value).
 * - **Multi-check** (a single move that simultaneously checks two or more
 *   opposing kings):
 *   | Kings checked | Non-queen mover | Queen mover |
 *   |---|---|---|
 *   | 2 | 5 | 1 |
 *   | 3 or 4 | 20 | 5 |
 * - **Checkmate**: 20 points, credited to whichever attacking color comes
 *   next in turn order after the mated player (see
 *   {@link DefaultRuleSet.awardCheckmatePoints}).
 * - **Stalemate**: the stalemated player receives 20 consolation points
 *   (unless already resigned/timed-out), and every other active player
 *   receives 10 points.
 * - **Draw** (repetition, 50-move rule, or insufficient material): every
 *   active player receives 10 points.
 *
 * ### Resigned / timed-out players
 * Rather than being removed outright, a resigned or timed-out player's
 * king is kept active and auto-played via a random legal move each turn
 * (see {@link RuleSet.advanceTurn}) for as long as it has legal moves,
 * while the rest of their pieces are frozen. Once their king itself has
 * no legal moves left, they are treated as stalemated and fully
 * deactivated (see {@link DefaultRuleSet.updatePlayerPiecesStatus}).
 *
 * ### Draw rules adapted for four players
 * - The 50-move rule is scaled to 4 players (50 turns per player × 4 =
 *   200 half-moves; see {@link DefaultRuleSet.isDrawBy50MovesRule}).
 * - Insufficient material accounts for the king + two knights case, which
 *   remains theoretically capable of delivering checkmate on a
 *   cooperating opponent (see
 *   {@link DefaultRuleSet.isDrawByInsufficientMaterial}).
 */
export class DefaultRuleSet extends RuleSet {
  /**
   * Keys of the form `${color}-${state}` for checkmate/stalemate bonuses
   * already awarded, ensuring each state transition is only rewarded
   * once even though {@link DefaultRuleSet.awardMatePoints} runs on every
   * post-move rule pass while the state persists.
   */
  private awardedMateStates = new Set<string>();

  /**
   * Length of the game history already processed for capture and
   * multi-check point awarding, preventing the same move from being
   * scored more than once.
   */
  private awardedMoveHistoryLength = 0;

  /**
   * Length of the game history already processed for move-clock
   * bookkeeping (50-move rule) in {@link DefaultRuleSet.updateGameState}.
   * Tracked separately from {@link DefaultRuleSet.awardedMoveHistoryLength}
   * since scoring and move-clock updates are independent concerns.
   */
  private processedHistoryLength = 0;

  constructor(
    moveGenerator: MoveGenerator
  ) { super(moveGenerator); }

  /**
   * Awards all points triggered by the most recent move and/or the
   * current game state: capture and multi-check bonuses for the latest
   * move (each processed at most once), mate/stalemate bonuses (each
   * idempotent per color/state), and draw bonuses.
   */
  private awardPoints(_game: Game): void {
    if (_game.getHistory().length > this.awardedMoveHistoryLength) {
      this.awardCapturePoints(_game);
      this.awardMultiCheckPoints(_game);
      this.awardedMoveHistoryLength = _game.getHistory().length;
    }

    this.awardMatePoints(_game);

    if (this.isDraw(_game)) {
      this.getActivePlayers(_game).forEach(player =>
        this.awardPlayerPoints(player, 10, _game)
      );
    }
  }

  /**
   * Awards the standard point value of the piece captured by the most
   * recent move to the capturing player.
   *
   * No-op if the last move was not a capture, if the captured piece is no
   * longer marked active (e.g. it belonged to a player already
   * eliminated by other means), or if the capturing player is not
   * currently active.
   */
  protected awardCapturePoints (_game: Game): void {

    const history = _game.getHistory();
    const lastMove = history[history.length - 1];
    const capturedPieceId = lastMove.capture;

    if (capturedPieceId === undefined) return;

    const capturedPiece = _game.getCapturedPiece(capturedPieceId)!;
    if(!capturedPiece.active) return;

    if(!_game.isPlayerActive(capturedPiece.capturedBy)) return;

    const awardedPoints = capturedPiece.points? capturedPiece.points: 0;

    this.awardPlayerPoints(
      capturedPiece.capturedBy,
      awardedPoints,
      _game
    ); 

  }

  /**
   * Awards a bonus when the most recent move simultaneously checks two or
   * more opposing kings (see the class-level scoring table). No-op if the
   * move delivered no check, or if it checked only a single king.
   */
  protected awardMultiCheckPoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];

    const checkInfos = lastMove.check;

    if (checkInfos === undefined) return;

    const checkedKings: Set<Color> = new Set(
      Array.from(checkInfos.values()).flat()
    )

    if (checkedKings.size < 2) return;

    const movedPiece = _game.getBoard().getPiece(lastMove.pieceId)!;

    switch(movedPiece.type) {
      case PieceType.QUEEN:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.size === 2? 1: 5,
          _game
        );
        return;
      default:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.size === 2? 5: 20,
          _game
        );
        return;
    }
  }

  /**
   * Checks every color for a newly reached checkmate or stalemate state
   * and dispatches the corresponding one-time point award. Safe to call
   * repeatedly — already-awarded states are skipped via
   * {@link DefaultRuleSet.markMateAwardPending}.
   */
  protected awardMatePoints(game: Game): void {
      for (const color of DefaultRuleSet.PLAYER_COLORS) {
        if (
          game.isPlayerCheckMated(color) &&
          this.markMateAwardPending(color, PlayerState.CHECKMATE)
        ) {
          this.awardCheckmatePoints(color, game);
        }
        if (
          game.isPlayerStalled(color) &&
          this.markMateAwardPending(color, PlayerState.STALEMATE)
        ) {

          if(!game.isPlayerResignedOrTimedOut(color))
            this.awardPlayerPoints(color, 20, game);

          this.awardStalematePoints(color, game);
        }
      }
  }

  /**
   * Idempotency guard ensuring a given (color, state) combination is only
   * ever processed once for point-awarding purposes, since checkmate and
   * stalemate states persist across many subsequent
   * {@link DefaultRuleSet.applyRulesPostMove} calls.
   *
   * @returns `true` the first time this (color, state) pair is seen
   * (and records it), `false` on every subsequent call for the same pair.
   */
  private markMateAwardPending(color: Color, state: PlayerState): boolean {
    const key = `${color}-${state}`;

    if (this.awardedMateStates.has(key)) return false;

    this.awardedMateStates.add(key);
    return true;
  }

  /**
   * Awards the 20-point checkmate bonus for `checkedColor`'s mate.
   *
   * Because a king can be checkmated while simultaneously in check from
   * pieces of more than one color, credit is resolved by walking the turn
   * order starting right after the mated player and awarding the bonus
   * to the **first attacking color encountered** in that order. This
   * acts as a deterministic tie-break when multiple colors share
   * responsibility for the mate.
   *
   * No-op if, unexpectedly, no attacker can be found for the mated king.
   */
  private awardCheckmatePoints(
      checkedColor: Color,
      game: Game
  ): void {
      const checks = this.getActiveChecks(
          game.getBoard(),
          DefaultRuleSet.PLAYER_COLORS
      );

      const attackers = this.getCheckingPlayers(
          checks,
          checkedColor,
          game.getBoard()
      );

      if (attackers.length === 0) {
          return;
      }

      let current = game.getNextActivePlayerColor(checkedColor)!;

      while (current !== checkedColor) {
          if (attackers.includes(current)) {
              this.awardPlayerPoints(current, 20, game);
              return;
          }

          current = game.getNextActivePlayerColor(current)!;
      }
  }

  /**
   * Awards the standard 10-point stalemate bonus to every active player
   * other than the stalemated one.
   */
  private awardStalematePoints(
      stalledColor: Color,
      game: Game
  ): void {
      for (const color of DefaultRuleSet.PLAYER_COLORS) {
          if (color === stalledColor) {
              continue;
          }

          if (game.isPlayerActive(color)) {
            this.awardPlayerPoints(color, 10, game);
          }
      }
  }

  /**
   * Ends the game once either a single active player remains (the
   * winner) or a draw condition applies (see {@link RuleSet.isDraw}),
   * setting the game's status to {@link GameStatus.OVER}. No-op
   * otherwise — the game continues.
   */
  public endGame(game: Game): void {
    const activePlayers = this.getActivePlayers(game);

    if (activePlayers.length !== 1 && !this.isDraw(game)) {
      return;
    }


    game.setGameStatus(GameStatus.OVER);
  }

  /**
   * Resolves, from a checks map, the distinct set of colors whose pieces
   * are currently delivering check to `checkedColor`'s king.
   */
  private getCheckingPlayers(
      checks: Map<string, Color[]>,
      checkedColor: Color,
      board: Board
  ): Color[] {
      const attackers: Color[] = [];

      for (const [pieceId, checkedColors] of checks) {
          if (!checkedColors.includes(checkedColor)) {
              continue;
          }

          const attacker = board.getPiece(pieceId)!.color;

          if (!attackers.includes(attacker)) {
              attackers.push(attacker);
          }
      }

      return attackers;
  }

  /**
   * Computes which of `players`' pieces are currently delivering check
   * against any active king on the board (see
   * {@link RuleSet.getActiveChecks} for the general contract).
   *
   * Implementation: for every color, the position of its king is recorded
   * only if that king piece is currently marked active. Then, for each
   * attacking player in `players`, every one of their pieces' pseudo-legal
   * destination squares is compared against each active king's square,
   * skipping a piece's own color's king. Any match records that piece's
   * id as delivering check against that king's color.
   */
  protected getActiveChecks(
    board: Board,
    players: Iterable<Color>
  ): Map<string, Color[]> {
    const enemyKings = new Map<Color, number>();
    const checkInfos = new Map<string, Color[]>();

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      const kingPos = board.getPositionOf(`K-${color}`);
      if (kingPos !== undefined) {
        if (board.getPieceAt(kingPos)!.active)
          enemyKings.set(color, kingPos);
      }
    }

    for (const player of players) {
      for (const piece of board.getPiecesByColor(player)) {
        const moves = new Set(
          this.moveGenerator.generateMovesForPiece(piece, board)
        );

        for (const [kingColor, kingPos] of enemyKings) {
          if (kingColor === player) continue;
          if (!moves.has(kingPos)) continue;

          const checkedColors = checkInfos.get(piece.id) ?? [];
          checkedColors.push(kingColor);
          checkInfos.set(piece.id, checkedColors);
        }
      }
    }

    return checkInfos;
  }

  /**
   * Expands a pawn's pseudo-legal moves with promotion, double-step, and
   * en passant moves as applicable.
   *
   * Promotion destinations (see {@link DefaultRuleSet.getPromotionMoves})
   * are matched against `moves` by destination square and swapped in with
   * their `pawnSpecialMove: "promotion"` tag, correctly covering both a
   * straight-push promotion and a diagonal-capture promotion.
   */
  protected withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[] {
    const board = game.getBoard();
    const promotionMoves = this.getPromotionMoves(pawn, from, board);
    const doubleStepMove = this.getPawnDoubleStep(pawn, from, board);
    const enPassantMoves = this.getEnPassantMoves(pawn, from, game);

    if (promotionMoves.length > 0) {
      const promotionByDestination = new Map(
        promotionMoves.map(move => [move.to, move])
      );
      moves = moves.map(move => promotionByDestination.get(move.to) ?? move);
    }

    if (doubleStepMove) moves.push(doubleStepMove);
    if (enPassantMoves) moves.push(...enPassantMoves);

    return moves;
  }

  /**
   * Computes a pawn's double-step move (two squares forward from its
   * starting rank), provided both the intermediate and destination
   * squares are valid and unoccupied.
   *
   * @returns The double-step move, or `undefined` if the pawn isn't
   * eligible or the path isn't clear.
   */
  private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
    const forward = forwardDirection(pawn.color);

    if (!this.canDoubleSteps(pawn, from)) return undefined;

    const oneStepSquare = from + forward.rowDelta + 14 * forward.colDelta;
    const doubleStepSquare = oneStepSquare + forward.rowDelta + 14 * forward.colDelta;

    if (
      board.isValidSquare(oneStepSquare) &&
      !board.isOccupied(oneStepSquare) &&
      board.isValidSquare(doubleStepSquare) &&
      !board.isOccupied(doubleStepSquare)
    ) {
      return this.moveGenerator.buildMove(
        pawn.id,
        from,
        doubleStepSquare,
        undefined,
        "doublestep"
      );
    }

    return undefined;
  }

  /**
   * Computes the currently available castling moves (kingside and/or
   * queenside) for `player`.
   *
   * A side is available only if: the player is not currently in check and
   * not resigned/timed-out; neither the king nor that side's rook have
   * moved from their initial squares; and the square the king passes
   * through plus its destination square are both unoccupied and not
   * attacked by any opponent's pseudo-legal moves.
   *
   * @remarks
   * This does not independently verify a fully clear path for the rook
   * beyond what's implied by the two squares checked for the king — worth
   * double-checking against exact board geometry if castling ever
   * misbehaves near edge-case rook distances.
   */
  public getCastleMoves(player: Color, game: Game): Move[] {
    if (game.getPlayerState(player) === PlayerState.CHECK ||
        game.isPlayerResignedOrTimedOut(player)
    ) {
      return [];
    }

    const castle: Move[] = [];
    const board = game.getBoard();
    const hasKingMoved = game.hasPieceMoved(`K-${player}`);
    const from = board.getPositionOf(`K-${player}`)!;

    for (const kingSide of [true, false]) {
      const side = kingSide ? "kingside" : "queenside";
      const hasRookMoved = game.hasPieceMoved(`R-${player}-${side}`);
      const rookPos = board.getPositionOf(`R-${player}-${side}`)!;

      if (
        from === kingInitialSquareId(player) &&
        !hasKingMoved &&
        rookPos === rookInitialSquareId(player, kingSide) &&
        !hasRookMoved
      ) {
        const allOpponentsMoves = this.moveGenerator.generateAllOpponentsMoves(board, player);
        const direction = castleDirectionOffset(player, kingSide);
        const oneStep = from + direction;
        const doubleStep = oneStep + direction;

        if (
          !board.isOccupied(oneStep) &&
          !allOpponentsMoves.has(oneStep) &&
          !board.isOccupied(doubleStep) &&
          !allOpponentsMoves.has(doubleStep)
        ) {
          castle.push(this.moveGenerator.buildMove(
            `K-${player}`,
            from,
            doubleStep,
            side
          ));
        }
      }
    }

    return castle;
  }

  /**
   * Determines whether `pawn` is currently on its color's starting rank
   * (the only position from which a double-step is allowed), based on
   * its color-specific direction of travel across the board.
   */
  protected canDoubleSteps(pawn: Piece, from: number): boolean {
    switch (pawn.color) {
      case Color.RED:
        return from % 14 + 1 === 2;
      case Color.YELLOW:
        return from % 14 + 1 === 13;
      case Color.BLUE:
        return Math.trunc(from / 14) + 1 === 2;
      case Color.GREEN:
        return Math.trunc(from / 14) + 1 === 13;
      default:
        return false;
    }
  }

  /**
   * Computes en passant capture moves available to `pawn` from `from`.
   *
   * Adapted for four players: rather than only considering the single
   * immediately preceding move (as in two-player chess), this checks
   * **every** opponent move made since this pawn's own color last had a
   * turn (see {@link DefaultRuleSet.getOpponentMovesSinceLastTurn}), since
   * up to three opponents may have moved in between. Each qualifying
   * double-step move by an adjacent enemy pawn produces a corresponding
   * en passant capture option.
   *
   * @returns An array of available en passant moves (possibly empty) if
   * `from` is one of the squares from which en passant is geometrically
   * possible; an empty array otherwise.
   */
  public getEnPassantMoves(
    pawn: Piece,
    from: number,
    game: Game
  ): Move[] {
    if (!EN_PASSANT_SQUARES_IDS.has(from))
      return [];

    const moves: Move[] = [];

    const opponentMoves = this.getOpponentMovesSinceLastTurn(
      pawn.color,
      game
    );

    for (const move of opponentMoves) {
      if (move.pawnSpecialMove !== "doublestep")
        continue;

      const destination = this.getEnPassantDestination(
        pawn,
        from,
        move
      );

      if (destination === undefined)
        continue;

      moves.push(
        this.moveGenerator.buildMove(
          pawn.id,
          from,
          destination,
          undefined,
          "e-p"
        )
      );
    }

    return moves;
  }

  /**
   * Resolves the destination square of an en passant capture against a
   * specific opponent double-step move, based on `pawn`'s color-specific
   * direction of travel and adjacency to the opponent's landing square.
   *
   * @returns The capture destination square, or `undefined` if
   * `lastMove` is not adjacent to `pawn` in a way that permits en passant.
   */
  private getEnPassantDestination(
    pawn: Piece,
    from: number,
    lastMove: Move
  ): number | undefined {
    if (pawn.color === Color.RED || pawn.color === Color.YELLOW) {
      if (lastMove.to !== from - 14 && lastMove.to !== from + 14) {
        return undefined;
      }

      return pawn.color === Color.RED ? lastMove.to + 1 : lastMove.to - 1;
    }

    if (lastMove.to !== from - 1 && lastMove.to !== from + 1) {
      return undefined;
    }

    return pawn.color === Color.BLUE ? lastMove.to + 14 : lastMove.to - 14;
  }

  /**
   * Collects all moves played by other colors since `player`'s own last
   * move, walking the history backwards until (and excluding) `player`'s
   * most recent move.
   */
  private getOpponentMovesSinceLastTurn(
    player: Color,
    game: Game
  ): Move[] {
    const history = game.getHistory();
    const moves: Move[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const move = history[i];
      const moveColor = game.getBoard().getPiece(move?.pieceId)!.color;

      if (moveColor === player) {
        break;
      }

      moves.push(move);
    }

    return moves;
  }

  /**
   * Determines whether `pawn`, from its current square, is positioned to
   * promote on its very next forward step — i.e. whether it currently
   * sits on the rank/file immediately adjacent to the board's shared
   * midline (which functions as the effective "final rank" in this
   * four-player layout, since there is no single far edge shared by all
   * players as in two-player chess).
   */
  private canPromote(pawn: Piece, from: number): boolean {
    switch (pawn.color) {
      case Color.RED:
        return from % 14 + 1 === 7;
      case Color.YELLOW:
        return from % 14 + 1 === 8;
      case Color.BLUE:
        return Math.trunc(from / 14) + 1 === 7;
      case Color.GREEN:
        return Math.trunc(from / 14) + 1 === 8;
      default:
        return false;
    }
  }

  /**
   * Computes all promotion moves for `pawn` from `from`, if it is
   * currently positioned to cross the midline on its next forward step
   * (see {@link DefaultRuleSet.canPromote}).
   *
   * Reuses {@link pawnMoves} to compute destinations, since it already
   * combines the forward push and both diagonal capture directions in
   * exactly the way promotion needs to — a straight push if the square
   * ahead is empty, and/or a capture on either diagonal if occupied by an
   * enemy piece.
   *
   * @param pawn - The pawn to evaluate.
   * @param from - The pawn's current square id.
   * @param board - The board to evaluate against.
   * @returns All available promotion moves (empty if `pawn` is not yet
   * eligible to promote from `from`).
   */
  public getPromotionMoves(pawn: Piece, from: number, board: Board): Move[] {
    if (!this.canPromote(pawn, from)) return [];

    return pawnMoves(pawn, from, board).map(to =>
      this.moveGenerator.buildMove(pawn.id, from, to, undefined, "promotion")
    );
  }

  /**
   * Recomputes derived game state after a move (or skipped/auto-played
   * turn):
   * 1. Updates the 50-move-rule clock based on whether the most recently
   *    processed move was a capture or pawn move (reset) or neither
   *    (increment). Each history entry is processed at most once.
   * 2. If the current player is already finalized as checkmated or
   *    stalemated, does nothing further.
   * 3. Otherwise, resets all players' `CHECK` state and recomputes it
   *    from scratch based on the current board position.
   * 4. If the current player still has at least one legal move, stops
   *    here. Otherwise, marks them as `CHECKMATE` (if currently in check)
   *    or `STALEMATE` (if not).
   *
   * No-op entirely if the game is already over.
   */
  public updateGameState(game: Game): void {
    if (game.isOver()) return;
    
    const history = game.getHistory();
    if (history.length > this.processedHistoryLength) {
      const lastMove = history[history.length - 1];
      const piecePlayed = game.getBoard().getPiece(lastMove.pieceId)!;

      if (!lastMove.capture && piecePlayed.type !== PieceType.PAWN) {
        game.incrementMoveClock();
      } else {
        game.resetMoveClock();
      }

      this.processedHistoryLength = history.length;
    }
    
    const currentPlayerColor = game.getCurrentPlayerColor();
    if (
      game.hasPlayerState(currentPlayerColor, PlayerState.CHECKMATE) ||
      game.hasPlayerState(currentPlayerColor, PlayerState.STALEMATE)
    ) {
      return;
    }

    // Reset all active CHECK states before recomputing them.
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (game.hasPlayerState(color, PlayerState.CHECK)) {
        game.setPlayerState(color, PlayerState.NORMAL);
      }
    }

    // Recompute all active checks from the current board position.
    const activeChecks = this.getActiveChecks(
      game.getBoard(),
      DefaultRuleSet.PLAYER_COLORS
    );

    const checkedColors: Color[] = Array.from(activeChecks.values()).flat();

    for (const color of new Set(checkedColors)) {
      game.setPlayerState(color, PlayerState.CHECK);
    }

    if (!this.isPlayerMate(currentPlayerColor, game)) return;

    if (checkedColors.includes(currentPlayerColor)) {
      game.setPlayerState(currentPlayerColor, PlayerState.CHECKMATE);
    } else {
      game.setPlayerState(currentPlayerColor, PlayerState.STALEMATE);
    }
  }

  /**
   * Concrete post-move hook (see {@link RuleSet.applyRulesPostMove}):
   * recomputes game/check state, awards all applicable points, syncs
   * every player's piece-active status with their current player state,
   * and checks whether the game should end.
   */
  protected applyRulesPostMove(game: Game): void {
    this.updateGameState(game);
    this.awardPoints(game);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      this.updatePlayerPiecesStatus(color, game);
    }

    this.endGame(game);
  }

  /**
   * Synchronizes a player's pieces' active status on the board with their
   * current standing:
   * - An inactive-but-resigned/timed-out player who has **not yet**
   *   stalled (see {@link Game.isPlayerStalled}) keeps their king active
   *   (`keepKingActive = true`) so it can continue to be auto-played by
   *   {@link RuleSet.advanceTurn}, while their other pieces are frozen.
   * - Once such a player has stalled (their king has no legal moves
   *   left), or if they are inactive for any other reason (e.g. formally
   *   eliminated), all of their pieces including the king are deactivated.
   */
  private updatePlayerPiecesStatus(color: Color, game: Game): void {
    if (!game.isPlayerActive(color)) {

        if (game.isPlayerResignedOrTimedOut(color)) {

            if (game.isPlayerStalled(color))
                game.setPlayerInactive(color);
            else
                game.setPlayerInactive(color, true);

        } else {
            game.setPlayerInactive(color);
        }
    }
  }

  /**
   * Determines whether the position is drawn due to insufficient mating
   * material, evaluated per active player and then combined:
   * - Any remaining pawn, rook, or queen (for any active player) means
   *   sufficient material is still on the board.
   * - More than a king plus two minor pieces for any single player is
   *   always sufficient.
   * - A king plus two minor pieces including at least one bishop (K+B+B
   *   or K+B+N) is always sufficient.
   * - If no player has king + two **knights** specifically, the position
   *   is drawn (only bare kings, king+bishop(s), or king+single-knight
   *   combinations remain, none of which can force checkmate).
   * - Otherwise, at least one player has king + two knights, which
   *   remains theoretically capable of checkmate only if some defending
   *   king still has at least 2 legal moves (enough freedom to
   *   cooperate, even unintentionally, in being mated). If every
   *   remaining king has fewer than 2 legal moves, the position is
   *   drawn; otherwise it is not.
   *
   * Resigned or timed-out players are still considered (their pieces
   * remain relevant) until they are formally eliminated (checkmated or
   * stalemated); fully inactive players are ignored.
   */
  public isDrawByInsufficientMaterial(game: Game): boolean {
    const remainingPieces = new Map<Color, Piece[]>([
      [Color.RED, []], [Color.BLUE, []],
      [Color.YELLOW, []], [Color.GREEN, []]
    ]);

    const remainingKingsMovesLength = new Map<Color, number>([
      [Color.RED, 0], [Color.BLUE, 0],
      [Color.YELLOW, 0], [Color.GREEN, 0]
    ]);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      // Ignore players that are already out of the game.
      // Resigned or timed-out kings are still considered because they
      // remain active until they are eventually checkmated or stalemated.
      if(!game.isPlayerActive(color) && 
         !game.isPlayerResignedOrTimedOut(color)
        ) {
          continue;
        }

      const pieces = game.getBoard().getPiecesByColor(color);

      for (const piece of pieces) {
        // Any remaining pawn, rook or queen is sufficient mating material.
        if (
          piece.type !== PieceType.BISHOP &&
          piece.type !== PieceType.KNIGHT &&
          piece.type !== PieceType.KING
        ) {
          return false;
        }

        const playerPieces = remainingPieces.get(color)!;
        if(piece.active) {
          // Still necessary condition because
          // of resigned or timed-out players
          playerPieces.push(piece);
        }
        remainingPieces.set(color, playerPieces);

        // Store the king mobility.
        // It is only needed for the king + two knights endgame,
        // where checkmate remains theoretically possible if the defending
        // king still has enough freedom to cooperate unintentionally.
        if (piece.type === PieceType.KING) {
          const kingMoves = this.moveGenerator.generateMovesForPiece(
            piece,
            game.getBoard()
          );

          remainingKingsMovesLength.set(color, kingMoves.length);
        }
      }

      const remainingPieceTypes = remainingPieces
        .get(color)!
        .map(piece => piece.type);

      // More than king + two minor pieces is always sufficient material.
      if (remainingPieceTypes.length > 3)
        return false;

      // Any combination containing a bishop (K+B+B or K+B+N)
      // is sufficient mating material.
      if (
        remainingPieceTypes.length === 3 &&
        remainingPieceTypes.includes(PieceType.BISHOP)
      ) {
        return false;
      }
    }

    let hasDoubleKnight = false;

    for (const pieces of remainingPieces.values()) {
      if (pieces.length === 3) {
        hasDoubleKnight = true;
        break;
      }
    }

    // Only kings, kings + bishops and kings + single knights remain.
    // None of these positions can lead to a forced checkmate.
    if (!hasDoubleKnight)
      return true;

    // At least one player still has king + two knights.
    // Checkmate remains theoretically possible only if a defending king
    // still has enough legal moves to cooperate unintentionally.
    const kingMoveCounts = Array.from(remainingKingsMovesLength.values());

    return kingMoveCounts.every(moveCount => moveCount < 2);
  }

  /**
   * Determines whether the position is drawn under the 50-move rule,
   * scaled to four players: 50 turns per player × 4 players = 200
   * half-moves without a capture or pawn move.
   */
  public isDrawBy50MovesRule(game: Game): boolean {
    return game.getMoveClock() >= 200;
  }
}