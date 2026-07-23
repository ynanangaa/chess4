import { Board } from "../board";
import { Move } from "../moves";
import { Player } from "../players";
import { RuleSet } from "../rules";
import { CapturedPiece, Color, GameStatus, Piece, PlayerState } from "../types";
import { GameState } from "./game-state";

const NEXT_PLAYER_COLOR = new Map<Color, Color>([
  [Color.RED, Color.BLUE],
  [Color.BLUE, Color.YELLOW],
  [Color.YELLOW, Color.GREEN],
  [Color.GREEN, Color.RED]
]);

/**
 * Main public API and stateful orchestrator for a four-player chess game.
 *
 * `Game` combines a {@link Board}, a {@link RuleSet}, player scoring,
 * move history, captured-piece records, repetition tracking, and
 * non-board state held by {@link GameState}.
 *
 * Most consumers should interact with a game through:
 * - {@link Game.advanceTurn} to play a complete turn;
 * - {@link Game.getLegalMoves} to obtain valid moves for a piece;
 * - {@link Game.getBoard} to inspect board state;
 * - {@link Game.getHistory} to inspect played moves;
 * - {@link Game.rankPlayersByScore} to inspect standings.
 *
 * The supplied {@link RuleSet} owns chess-variant-specific behavior:
 * legality, check, checkmate, castling, en passant, scoring, draws, and
 * game-ending rules.
 *
 * @example
 * ```ts
 * const game = new Game(new DefaultRuleSet(new MoveGenerator()));
 *
 * const moves = game.getLegalMoves("red-1");
 * const move = moves[0];
 *
 * if (move) {
 *   game.advanceTurn(move);
 * }
 * ```
 */
export class Game {
  /** Mutable board state for the current game position. */
  private board: Board;

  /** Turn, status, player-state, and move-clock data. */
  private gameState: GameState;

  /** Moves successfully applied to this game, in chronological order. */
  private history: Move[];

  /**
   * Ids of pieces that have moved at least once.
   *
   * This is primarily used to determine castling eligibility.
   */
  private movedPieces = new Set<string>();

  /** The four fixed players, one for each board color. */
  private players: Player[];

  /**
   * Captured pieces keyed by stable piece id.
   *
   * A captured piece is removed from the board but retained here for
   * scoring and move-history purposes.
   */
  private capturedPieces = new Map<string, CapturedPiece>();

  /**
   * Number of times each computed position key has occurred, used for
   * threefold repetition detection.
   */
  private positionCounts = new Map<string, number>();

  /**
   * Creates a game.
   *
   * @param ruleSet - The rules engine governing this game variant.
   * @param initialPieces - Optional board setup as `[pieces, squareIds]`.
   * Omit this argument to use the standard four-player starting setup.
   * @param history - Optional initial move history. This history is copied,
   * but it is not replayed onto the board and does not reconstruct moved
   * pieces, captures, scores, clocks, player states, or position counts.
   * It should therefore normally be supplied only when those states are
   * established separately or when constructing a specialized scenario.
   */
  constructor(
    private ruleSet: RuleSet,
    initialPieces?: [Piece[], number[]],
    history?: Move[]
  ) {
    this.board = new Board(initialPieces);
    this.history = history ? history.slice() : [];
    this.players = [
      new Player("P1", Color.RED),
      new Player("P2", Color.BLUE),
      new Player("P3", Color.YELLOW),
      new Player("P4", Color.GREEN)
    ];
    this.gameState = new GameState();
  }

  /**
   * Clears selected transient move-tracking data.
   *
   * Specifically, this clears move history and moved-piece tracking used
   * for castling rights.
   *
   * @remarks
   * Despite its name, this is not a complete game reset or disposal
   * operation. It does not reset the board, game status, player scores,
   * captured pieces, position counts, move clock, or player states.
   */
  public destroy(): void {
    this.history.length = 0;
    this.movedPieces.clear();
  }

  /**
   * Adds an already-applied move to chronological game history.
   *
   * This is primarily intended for use by {@link RuleSet}; external
   * consumers should normally use {@link Game.advanceTurn}.
   *
   * @param move - The move to record.
   */
  public addMoveToHistory(move: Move): void {
    this.history.push(move);
  }

  /**
   * Marks a piece as having moved at least once.
   *
   * This is used by rulesets to determine castling availability.
   *
   * @param id - The stable id of the piece.
   */
  public addMovedPiece(id: string): void {
    this.movedPieces.add(id);
  }

  /**
   * Records a captured piece after it has been removed from the board.
   *
   * @param id - The stable id of the captured piece.
   * @param captured - Captured-piece data, including the capturing color.
   */
  public addCapturedPiece(id: string, captured: CapturedPiece): void {
    this.capturedPieces.set(id, captured);
  }

  /**
   * Applies a move to the board and records its immediate effects.
   *
   * This does not advance turn order or run the complete post-move rules
   * pipeline. In normal gameplay, prefer {@link Game.advanceTurn}.
   *
   * @param move - A move that has already been validated as legal.
   * @returns `true` if the move was applied; otherwise `false`.
   */
  public applyMove(move: Move): boolean {
    return this.ruleSet.applyMove(move, this);
  }

  /**
   * Processes one turn of the game.
   *
   * For an active player, `move` must be supplied and must belong to that
   * player's color. The ruleset applies the move, advances turn order,
   * recalculates state, awards points, and evaluates game-ending rules.
   *
   * Resigned, timed-out, and inactive players are handled according to the
   * active {@link RuleSet}.
   *
   * @param move - Move to play for the current active player.
   * @returns `true` if the turn was processed successfully; otherwise
   * `false`.
   */
  public advanceTurn(move?: Move): boolean {
    return this.ruleSet.advanceTurn(this, move);
  }

  /**
   * Attempts to claim victory under the ruleset's early-victory condition.
   *
   * In the default free-for-all ruleset, this requires exactly two active
   * players and a score lead large enough that the standard resignation
   * bonus cannot change the final winner.
   *
   * @param player - The color claiming victory.
   * @returns `true` if the claim succeeds and ends the game.
   */
  public claimVictory(player: Color): boolean {
    return this.ruleSet.claimVictory(player, this);
  }

  /**
   * Returns the mutable board representing the current position.
   *
   * @remarks
   * This returns the actual internal board, not a clone. Mutating it
   * directly bypasses turn validation, move history, scoring, check state,
   * and other ruleset bookkeeping. Prefer {@link Game.advanceTurn} for
   * normal gameplay mutations.
   */
  public getBoard(): Board {
    return this.board;
  }

  /**
   * Returns information about a previously captured piece.
   *
   * @param id - The stable id of the captured piece.
   * @returns The captured-piece record, or `undefined` if that piece has
   * not been captured in this game.
   */
  public getCapturedPiece(id: string): CapturedPiece | undefined {
    return this.capturedPieces.get(id);
  }

  /**
   * Returns the chronological move history.
   *
   * The returned array is a shallow copy. Individual `Move` objects,
   * including any `check` maps they contain, are not deep-cloned.
   */
  public getHistory(): Move[] {
    return this.history.slice();
  }

  /**
   * Returns the mutable non-board state of this game.
   *
   * @remarks
   * This returns the actual internal {@link GameState}. Prefer the
   * convenience accessors on `Game` when possible; direct mutation can
   * bypass normal ruleset orchestration.
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Returns the color whose turn is currently active.
   */
  public getCurrentPlayerColor(): Color {
    return this.gameState.getCurrentPlayerColor();
  }

  /**
   * Returns the player assigned to a color.
   *
   * @param color - The player's board color.
   * @throws {@link Error} If the color does not identify a known player.
   */
  public getPlayer(color: Color): Player {
    const player = this.players.find(p => p.getColor() === color);

    if (!player) {
        throw new Error(`Unknown player ${color}`);
    }

    return player;
  }

  /**
   * Returns the most recently assigned state for a player.
   *
   * @param color - The player color to inspect.
   */
  public getPlayerState(color: Color): PlayerState {
    return this.gameState.getPlayerState(color)!;
  }

  /**
   * Returns all currently stored states for a player.
   *
   * @param color - The player color to inspect.
   */
  public getPlayerStates(color: Color): PlayerState[] {
    return this.gameState.getPlayerStates(color);
  }

  /**
   * Returns the number of times a position key has been recorded.
   *
   * Position keys are normally created by
   * {@link RuleSet.computePositionKey}.
   *
   * @param positionKey - The deterministic position key to inspect.
   */
  public getPositionCount(positionKey: string): number {
    return this.positionCounts.get(positionKey) ?? 0;
  }

  /**
   * Computes every fully legal move currently available to a piece.
   *
   * @param pieceId - The stable id of the piece to inspect.
   * @returns Legal moves for the piece, or an empty array if the piece
   * does not exist, is inactive, belongs to a checkmated/stalemated player,
   * or has no legal destinations.
   */
  public getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(pieceId, this);
  }

  /**
   * Returns the current no-capture/no-pawn-move clock used for the
   * 50-move-rule draw condition.
   */
  public getMoveClock(): number {
    return this.gameState.getMoveClock();
  }

  /**
   * Checks whether a piece has moved at least once in this game.
   *
   * This is primarily used for castling-rights evaluation.
   *
   * @param pieceId - The stable id of the piece.
   */
  public hasPieceMoved(pieceId: string): boolean {
    return this.movedPieces.has(pieceId);
  }

  /**
   * Checks whether a player has a specific stored state.
   *
   * @param color - The player color to inspect.
   * @param state - The state to check for.
   */
  public hasPlayerState(color: Color, state: PlayerState): boolean {
    return this.gameState.hasPlayerState(color, state);
  }

  /** Increments the move clock by one. Intended for ruleset use. */
  public incrementMoveClock(): void {
    this.gameState.incrementMoveClock();
  }

  /**
   * Adds points to a player's score.
   *
   * Intended for ruleset scoring logic.
   *
   * @param color - The player receiving points.
   * @param points - Number of points to award.
   */
  public incrementPlayerScore(color: Color, points: number): void {
    const playerIndex = this.players.findIndex(
      p => p.getColor() === color
    );
    this.players[playerIndex].incrementScore(points);
  }

  /**
   * Records one occurrence of a position key for repetition detection.
   *
   * @param positionKey - Position key, normally produced by
   * {@link RuleSet.computePositionKey}.
   */
  public incrementPositionCount(positionKey: string): void {
    const n = this.positionCounts.get(positionKey) ?? 0;
    this.positionCounts.set(positionKey, n + 1);
  }

  /**
   * Checks whether the game has ended.
   */
  public isOver(): boolean {
    return this.gameState.getStatus() === GameStatus.OVER;
  }

  /**
   * Checks whether a player is currently active in the game.
   *
   * An active player must have `NORMAL` or `CHECK`, must not be checkmated
   * or stalemated, and must not have resigned or timed out.
   *
   * @param color - The player color to inspect.
   */
  public isPlayerActive(color: Color): boolean {
    return (
      (
        this.hasPlayerState(color, PlayerState.NORMAL) ||
        this.hasPlayerState(color, PlayerState.CHECK)
      ) &&
      !this.hasPlayerState(color, PlayerState.CHECKMATE) &&
      !this.hasPlayerState(color, PlayerState.STALEMATE) &&
      !this.isPlayerResignedOrTimedOut(color)
    );
  }

  /**
   * Checks whether a player has been checkmated.
   */
  public isPlayerCheckMated(color: Color): boolean {
    return this.hasPlayerState(color, PlayerState.CHECKMATE);
  }

  /**
   * Checks whether a player has been stalemated.
   */
  public isPlayerStalled(color: Color): boolean {
    return this.hasPlayerState(color, PlayerState.STALEMATE);
  }

  /**
   * Checks whether a player has resigned or timed out.
   */
  public isPlayerResignedOrTimedOut(color: Color): boolean {
    return (
      this.hasPlayerState(color, PlayerState.RESIGNED) ||
      this.hasPlayerState(color, PlayerState.TIMED_OUT)
    );
  }

  /**
   * Returns the next color in the fixed four-player turn order:
   * RED → BLUE → YELLOW → GREEN → RED.
   *
   * This method does not skip inactive players.
   *
   * @param previous - Color from which to advance.
   */
  public getNextPlayerColor(previous: Color): Color {
    return NEXT_PLAYER_COLOR.get(previous)!;
  }

  /**
   * Returns the next active player after `previous`, following the fixed
   * four-player turn order.
   *
   * If no active player can be found after checking all colors, the method
   * returns the last examined color, which may itself be inactive.
   *
   * @param previous - Color from which to search forward.
   */
  public getNextActivePlayerColor(previous: Color): Color {
    let next = this.getNextPlayerColor(previous);
    let checkedPlayers = 0;

    while (!this.isPlayerActive(next)) {
      checkedPlayers += 1;
      if (checkedPlayers >= NEXT_PLAYER_COLOR.size) return next;

      next = this.getNextPlayerColor(next);
    }

    return next;
  }

  /**
   * Returns players ordered from highest to lowest score.
   *
   * The returned array is independent from the game's internal player
   * ordering.
   */
  public rankPlayersByScore(): Player[] {
    return [...this.players].sort((a, b) =>
      b.getScore() - a.getScore()
    );
  }

  /** Resets the no-capture/no-pawn-move clock to zero. */
  public resetMoveClock(): void {
    this.gameState.resetMoveClock();
  }

  /**
   * Marks a player as resigned and deactivates their pieces.
   *
   * @param color - The player resigning.
   * @param keepKingActive - If `true`, only non-king pieces are
   * deactivated, allowing the king to remain active for the ruleset's
   * resigned-player handling.
   */
  public resignPlayer(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    this.setPlayerState(color, PlayerState.RESIGNED);
    this.setPlayerInactive(color, keepKingActive);
  }

  /**
   * Advances the current-player color by one fixed turn-order step.
   *
   * Inactive players are not skipped here; skipped-turn behavior belongs to
   * {@link RuleSet.advanceTurn}.
   */
  public advanceCurrentPlayer(): void {
    this.gameState.setCurrentPlayerColor(
      this.getNextPlayerColor(this.getCurrentPlayerColor())
    );
  }

  /**
   * Sets the overall game lifecycle status.
   *
   * Intended for use by the active ruleset when an end condition is met.
   */
  public setGameStatus(status: GameStatus): void {
    this.gameState.setStatus(status);
  }

  /**
   * Adds or updates a state for a player.
   *
   * @param color - The player color to update.
   * @param state - The state to apply.
   */
  public setPlayerState(color: Color, state: PlayerState): void {
    this.gameState.setPlayerState(color, state);
  }

  /**
   * Deactivates a player's pieces on the board.
   *
   * @param color - The player whose pieces should be deactivated.
   * @param keepKingActive - If `true`, leave the king active while
   * deactivating the player's other pieces.
   */
  public setPlayerInactive(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    this.board.setPlayerPiecesInactive(color, keepKingActive);
  }
}