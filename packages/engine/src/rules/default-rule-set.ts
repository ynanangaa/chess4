import { Board } from "../board";
import { Game, getMutableBoard, getMutableGameInternals } from "../game";
import { Move, MoveGenerator } from "../moves";
import { castleDirectionOffset } from "../moves/king-moves";
import { stepInDirection } from "../moves/move-geometry";
import { forwardDirection, pawnMoves } from "../moves/pawn-moves";
import { Color, GameStatus, Piece, PieceType } from "../types";
import { kingInitialSquareId, rookInitialSquareId } from "../utils/utils";
import { RuleSet } from "./rule-set";

/**
 * Concrete, standard four-player ruleset: fills in every `abstract`
 * member of {@link RuleSet} with the rules of the base (non-team)
 * variant — individual check/checkmate/stalemate detection, standard
 * castling and promotion, the four-player scoring economy (captures,
 * multi-check bonuses, mate/stalemate bonuses, sole-survivor and draw
 * bonuses), and both draw conditions not already implemented by
 * `RuleSet` itself (50-move and insufficient-material).
 *
 * @remarks
 * `TeamRuleSet` currently extends this class rather than `RuleSet`
 * directly; team-specific overrides are expected to replace only the
 * subset of behavior that differs.
 */

export class DefaultRuleSet extends RuleSet {

  /**
   * Guards {@link DefaultRuleSet.awardMatePoints} so a given player's
   * checkmate/stalemate bonus is only ever paid once, even though
   * `awardMatePoints` is re-evaluated on every subsequent turn for as
   * long as that player remains mated. Keyed as `` `${color}-${kind}` ``
   * (e.g. `"red-checkmate"`).
   */
  private awardedMateStates = new Set<string>();

  /**
   * Length of {@link Game.getHistory} the last time capture/multi-check
   * points were awarded (see {@link DefaultRuleSet.awardPoints}). Used
   * to ensure those one-time-per-move bonuses are only evaluated once
   * per new move, even though `awardPoints` itself may run more than
   * once per turn as inactive players are settled (see
   * `RuleSet.settleUpcomingTurns`).
   */
  private awardedMoveHistoryLength = 0;

  /**
   * Length of {@link Game.getHistory} the last time
   * {@link DefaultRuleSet.updateGameState} processed the move clock for
   * the latest move. Mirrors
   * {@link DefaultRuleSet.awardedMoveHistoryLength}'s purpose, but for
   * move-clock bookkeeping instead of scoring.
   */
  private processedHistoryLength = 0;

  /**
   * Creates a standard four-player ruleset.
   *
   * @param moveGenerator - The move generator used to compute
   * pseudo-legal piece movement (see {@link RuleSet}).
   */
  constructor(
    moveGenerator: MoveGenerator
  ) { super(moveGenerator); }

  /**
   * Runs every point-awarding check for the current position. One-time
   * per-move bonuses (capture, multi-check) are only evaluated the
   * first time this is called for a given history length (see
   * {@link DefaultRuleSet.awardedMoveHistoryLength}), since this
   * method's only caller, {@link RuleSet.applyRulesPostMove}, can run
   * multiple times per turn as inactive players are settled (see
   * `RuleSet.settleUpcomingTurns`). Mate/stalemate bonuses and the
   * draw-share bonus are safely re-evaluated every call, since their own
   * guards ({@link DefaultRuleSet.markMateAwardPending}, and the
   * draw-status check itself) are stateless and idempotent per call.
   *
   * @param isDraw - Whether the current position has just been
   * determined to be a draw (see {@link RuleSet.isDraw}); when `true`,
   * every active player is awarded a flat 10-point draw-share bonus.
   */

  private awardPoints(_game: Game, isDraw: boolean): void {
    if (_game.getHistory().length > this.awardedMoveHistoryLength) {
      this.awardCapturePoints(_game);
      this.awardMultiCheckPoints(_game);
      this.awardedMoveHistoryLength = _game.getHistory().length;
    }

    this.awardMatePoints(_game);

    if (isDraw) {
      this.getActivePlayers(_game).forEach(player =>
        this.awardPlayerPoints(player, 10, _game)
      );
    }
  }

  protected awardCapturePoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];
    const capturedPieceId = lastMove.capture;

    if (capturedPieceId === undefined) return;

    const capturedPiece = _game.getCapturedPiece(capturedPieceId)!;
    if (!capturedPiece.wasActive) return;

    if (!_game.isPlayerActive(capturedPiece.capturedBy)) return;

    const awardedPoints = capturedPiece.points ? capturedPiece.points : 0;

    this.awardPlayerPoints(capturedPiece.capturedBy, awardedPoints, _game);
  }

  protected awardMultiCheckPoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];

    const checkedKings = lastMove.check;

    if (!checkedKings || checkedKings.length < 2) return;

    const movedPiece = _game.getBoard().getPiece(lastMove.pieceId)!;

    switch(movedPiece.type) {
      case PieceType.QUEEN:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.length === 2? 1: 5,
          _game
        );
        return;
      default:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.length === 2? 5: 20,
          _game
        );
        return;
    }
  }

  /**
   * Awards checkmate and stalemate bonuses for every color whose status
   * newly qualifies, guarding each award so it is only ever paid once
   * per player per mate kind (see
   * {@link DefaultRuleSet.markMateAwardPending}), even though this
   * method is re-run on every subsequent call to
   * {@link DefaultRuleSet.awardPoints} for as long as that status
   * persists.
   *
   * - Checkmate: delegates to
   *   {@link DefaultRuleSet.awardCheckmatePoints}, crediting whichever
   *   color's move is found causally responsible (see
   *   {@link RuleSet.findCheckmateArchitect}).
   * - Stalemate: the stalemated player themself is awarded 20 points
   *   *unless* their stalemate stems from a resignation/timeout (i.e.
   *   they ran their own king out of legal moves while being
   *   auto-played); every other active player always receives a flat
   *   10-point share regardless (see
   *   {@link DefaultRuleSet.awardStalematePoints}).
   */
  protected awardMatePoints(game: Game): void {
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (
        game.isPlayerCheckMated(color) &&
        this.markMateAwardPending(color, 'checkmate')
      ) {
        this.awardCheckmatePoints(color, game);
      }
      if (
        game.isPlayerStalled(color) &&
        this.markMateAwardPending(color, 'stalemate')
      ) {
        if (!game.isPlayerResignedOrTimedOut(color))
          this.awardPlayerPoints(color, 20, game);

        this.awardStalematePoints(color, game);
      }
    }
  }

  private markMateAwardPending(color: Color, kind: 'checkmate' | 'stalemate'): boolean {
    const key = `${color}-${kind}`;

    if (this.awardedMateStates.has(key)) return false;

    this.awardedMateStates.add(key);
    return true;
  }

  private awardCheckmatePoints(
      checkedColor: Color,
      game: Game
  ): void {
      const architect = this.findCheckmateArchitect(checkedColor, game);

      if (architect === undefined) return;

      this.awardPlayerPoints(architect, 20, game);
  }

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
   * Ends the game, applying the standard draw/sole-survivor resolution
   * (see {@link DefaultRuleSet.endGameForDrawStatus}). Implements
   * {@link RuleSet.endGame}.
   */
  public endGame(game: Game): void {
    this.endGameForDrawStatus(game, this.isDraw(game));
  }

  private endGameForDrawStatus(game: Game, isDraw: boolean): void {
    if (game.isOver()) return;

    if (this.endGameIfSoleSurvivor(game, false)) return;

    if (!isDraw) return;

    getMutableGameInternals(game).setGameStatus(GameStatus.OVER);
  }

  protected isKingInCheck(board: Board, kingColor: Color): boolean {
    const kingPos = board.getKingSquare(kingColor);
    if (kingPos === undefined) return false;
    const king = board.getPieceAt(kingPos)!;
    if (!board.isPieceActive(king.id)) return false;

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (color === kingColor) continue;

      for (const piece of board.getPiecesByColor(color)) {
        if (this.moveGenerator.generateMovesForPiece(piece, board).includes(kingPos)) {
          return true;
        }
      }
    }

    return false;
  }

  protected withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[] {
    // CHANGED: game.getBoard() as Board → getMutableBoard(game)
    const board = getMutableBoard(game);
    const promotionMoves = this.getPromotionMoves(pawn, from, board);
    const doubleStepMove = this.getPawnDoubleStep(pawn, from, board);

    if (promotionMoves.length > 0) {
      const promotionByDestination = new Map(
        promotionMoves.map(move => [move.to, move])
      );
      moves = moves.map(move => promotionByDestination.get(move.to) ?? move);
    }

    if (doubleStepMove) moves.push(doubleStepMove);

    return moves;
  }

  private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
    if (!this.canDoubleSteps(pawn, from)) return undefined;

    const forward = forwardDirection(pawn.color);
    const oneStepSquare = stepInDirection(from, forward);
    const doubleStepSquare = stepInDirection(from, forward, 2);

    if (oneStepSquare === undefined || doubleStepSquare === undefined) return undefined;

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
   * Computes `player`'s currently available castling moves (kingside
   * and/or queenside). Implements {@link RuleSet.getCastleMoves}.
   *
   * A given side is available only if all of the following hold:
   * - `player` is not currently in check, and has not resigned/timed
   *   out.
   * - The king is still on its original starting square and has never
   *   moved (see {@link Game.hasPieceMoved}).
   * - The corresponding rook (`` `R-${player}-${side}` ``) is still on
   *   its original starting square and has never moved.
   * - Every square between the king and its destination — and, for
   *   queenside, the extra square the rook passes over — is
   *   unoccupied.
   * - Neither the square the king passes through nor its destination
   *   is attacked by any opposing piece, per pseudo-legal move
   *   generation (see {@link MoveGenerator.generateAllOpponentsMoves}).
   *   The king's *current* square doesn't need checking here, since the
   *   leading not-in-check requirement above already covers it.
   *
   * @returns An array containing a castling move for each currently
   * available side (0, 1, or 2 moves).
   */
  public getCastleMoves(player: Color, game: Game): Move[] {
    if (game.isPlayerInCheck(player) || game.isPlayerResignedOrTimedOut(player)) {
      return [];
    }

    const castle: Move[] = [];
    const board = game.getBoard() as Board;
    const from = board.getKingSquare(player);
    if (!from) return [];

    const king = board.getPieceAt(from)!;
    const hasKingMoved = game.hasPieceMoved(king.id);
    

    for (const kingSide of [true, false]) {
      const side = kingSide ? "kingside" : "queenside";
      const hasRookMoved = game.hasPieceMoved(`R-${player}-${side}`);
      const rookPos = board.getSquareOf(`R-${player}-${side}`)!;

      if (
        from === kingInitialSquareId(player) &&
        !hasKingMoved &&
        rookPos === rookInitialSquareId(player, kingSide) &&
        !hasRookMoved
      ) {
        const allOpponentsMoves = this.moveGenerator.
          generateAllOpponentsMoves(
            board,
            DefaultRuleSet.PLAYER_COLORS.filter(
              c => player !== c
            )
          );
        const direction = castleDirectionOffset(player, kingSide);
        const oneStep = from + direction;
        const doubleStep = oneStep + direction;
        const thirdStep = doubleStep + direction;

        const pathIsClear =
          !board.isOccupied(oneStep) &&
          !board.isOccupied(doubleStep) &&
          (
            kingSide ||
            !board.isOccupied(thirdStep)
          );

        const kingPathIsSafe =
          !allOpponentsMoves.has(oneStep) &&
          !allOpponentsMoves.has(doubleStep);

        if (pathIsClear && kingPathIsSafe) {
          castle.push(this.moveGenerator.buildMove(
            king.id,
            from,
            doubleStep,
            side
          ));
        }
      }
    }

    return castle;
  }

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
   * Computes a pawn's promotion moves: every ordinary destination
   * (forward step or diagonal capture) available to it, tagged as
   * `"promotion"`, if and only if the pawn is currently on its
   * promotion rank (see {@link DefaultRuleSet.canPromote}). Implements
   * {@link RuleSet.getPromotionMoves}.
   *
   * @remarks
   * This variant always promotes to a queen (see
   * `RuleSet.applyPromotion`); there is no under-promotion choice.
   */
  public getPromotionMoves(pawn: Piece, from: number, board: Board): Move[] {
    if (!this.canPromote(pawn, from)) return [];

    return pawnMoves(pawn, from, board).map(to =>
      this.moveGenerator.buildMove(pawn.id, from, to, undefined, "promotion")
    );
  }
  /**
   * Refreshes derived game state after a move: the move clock (reset
   * on a capture or pawn move, incremented otherwise — see
   * {@link DefaultRuleSet.isDrawBy50MovesRule}), every player's
   * `inCheck` flag, and the current player's checkmate/stalemate
   * status. Implements {@link RuleSet.updateGameState}.
   *
   * No-ops entirely if the game is already over, or if the current
   * player's king is no longer on the board (defensive guard). Move-clock
   * bookkeeping is only performed once per new history entry (see
   * {@link DefaultRuleSet.processedHistoryLength}), since this method —
   * like {@link DefaultRuleSet.awardPoints} — can be invoked more than
   * once per turn as inactive players are settled (see
   * `RuleSet.settleUpcomingTurns`). Checkmate/stalemate for the current
   * player, once already recorded, is left untouched rather than
   * re-evaluated.
   */
  public updateGameState(game: Game): void {
    if (game.isOver()) return;

    const history = game.getHistory();
    if (history.length > this.processedHistoryLength) {
      const lastMove = history[history.length - 1];
      const piecePlayed = game.getBoard().getPiece(lastMove.pieceId)!;

      // CHANGED: game.incrementMoveClock()/resetMoveClock() → internals
      const internals = getMutableGameInternals(game);
      if (!lastMove.capture && piecePlayed.type !== PieceType.PAWN) {
        internals.incrementMoveClock();
      } else {
        internals.resetMoveClock();
      }

      this.processedHistoryLength = history.length;
    }

    const currentPlayerColor = game.getCurrentPlayerColor();
    if (
      game.isPlayerCheckMated(currentPlayerColor) ||
      game.isPlayerStalled(currentPlayerColor)
    ) {
      return;
    }

    if (game.getBoard().getSquareOf(`K-${currentPlayerColor}`) === undefined) {
      return;
    }

    // CHANGED: game.getBoard() as Board → getMutableBoard(game)
    const checkedColors = this.getCheckedKings(getMutableBoard(game));

    // CHANGED: game.setPlayerInCheck → internals
    const internals = getMutableGameInternals(game);
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      internals.setPlayerInCheck(color, checkedColors.has(color));
    }

    if (!this.isPlayerMate(currentPlayerColor, game)) return;

    if (checkedColors.has(currentPlayerColor)) {
      internals.setPlayerCheckmated(currentPlayerColor);
    } else {
      internals.setPlayerStalemated(currentPlayerColor);
    }
  }

  /**
   * The per-turn pipeline run after every move settles (see
   * `RuleSet.settleUpcomingTurns`): refreshes check/mate/stalemate
   * state ({@link DefaultRuleSet.updateGameState}), awards any points
   * that state change earns ({@link DefaultRuleSet.awardPoints}),
   * deactivates the pieces of any player whose status now warrants it
   * (see {@link DefaultRuleSet.updatePlayerPiecesStatus}), and finally
   * checks whether the game should end (see
   * {@link DefaultRuleSet.endGameForDrawStatus}). Implements
   * {@link RuleSet.applyRulesPostMove}.
   */
  protected applyRulesPostMove(game: Game): void {
    this.updateGameState(game);

    const isDraw = this.isDraw(game);

    this.awardPoints(game, isDraw);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      this.updatePlayerPiecesStatus(color, game);
    }

    this.endGameForDrawStatus(game, isDraw);
  }

  private updatePlayerPiecesStatus(color: Color, game: Game): void {
    if (!game.isPlayerActive(color)) {

        if (game.isPlayerResignedOrTimedOut(color)) {

            if (game.isPlayerStalled(color) || game.isPlayerCheckMated(color))
                // CHANGED: game.setPlayerInactive(color) → direct board call
                getMutableBoard(game).setPlayerPiecesInactive(color);
            else
                getMutableBoard(game).setPlayerPiecesInactive(color, true);

        } else {
            getMutableBoard(game).setPlayerPiecesInactive(color);
        }
    }
  }

  /**
   * Checks whether the position is drawn due to insufficient mating
   * material across all still-relevant players (active players, plus
   * resigned/timed-out ones whose abandoned pieces remain on the
   * board). Implements {@link RuleSet.isDrawByInsufficientMaterial}.
   *
   * A player is excluded from consideration only if inactive for a
   * reason *other* than resignation/timeout (i.e. already
   * checkmated/stalemated — their position is already settled). For
   * every remaining player:
   *
   * - If any piece other than a king, bishop, or knight remains,
   *   material is sufficient and the position is not a draw.
   * - More than three total pieces (including the king), or exactly
   *   three including a bishop, is likewise treated as sufficient
   *   material.
   *
   * If no player retains two knights alongside their king, the
   * position is a draw. Otherwise (someone has king + two knights), the
   * position is still a draw unless every king currently has at least
   * two legal destination squares — reflecting that a king with two
   * knights can, in some corner positions, still force mate against a
   * king with too few escape squares, an exception standard two-player
   * insufficient-material rules don't need to account for.
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
      if(!game.isPlayerActive(color) &&
         !game.isPlayerResignedOrTimedOut(color)
        ) {
          continue;
        }

      const pieces = game.getBoard().getPiecesByColor(color);

      for (const piece of pieces) {
        if (
          piece.type !== PieceType.BISHOP &&
          piece.type !== PieceType.KNIGHT &&
          piece.type !== PieceType.KING
        ) {
          return false;
        }

        const playerPieces = remainingPieces.get(color)!;
        if (game.getBoard().isPieceActive(piece.id)) {
          playerPieces.push(piece);
        }
        remainingPieces.set(color, playerPieces);

        if (piece.type === PieceType.KING) {
          // CHANGED: game.getBoard() as Board → getMutableBoard(game)
          const kingMoves = this.moveGenerator.generateMovesForPiece(
            piece,
            getMutableBoard(game)
          );

          remainingKingsMovesLength.set(color, kingMoves.length);
        }
      }

      const remainingPieceTypes = remainingPieces
        .get(color)!
        .map(piece => piece.type);

      if (remainingPieceTypes.length > 3)
        return false;

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

    if (!hasDoubleKnight)
      return true;

    const kingMoveCounts = Array.from(remainingKingsMovesLength.values());

    return kingMoveCounts.every(moveCount => moveCount < 2);
  }

  /**
   * Checks whether the move clock has reached 200 half-moves without a
   * capture or pawn move — this variant's four-player-scaled
   * equivalent of the standard 50-move rule. Implements
   * {@link RuleSet.isDrawBy50MovesRule}.
   */
  public isDrawBy50MovesRule(game: Game): boolean {
    return game.getMoveClock() >= 200;
  }
}