import { Board, BoardSetup } from "../board";
import { ReadonlyBoard } from "../board/board";
import { Move } from "../moves";
import { Player } from "../players";
import { RuleSet } from "../rules";
import { CapturedPiece, Color, GameStatus, PlayerStatus } from "../types";
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
 * See prior class-level documentation — unchanged in spirit. The main
 * change here is that player state is now exposed as {@link PlayerStatus}
 * (independent `inCheck`/`checkmated`/`stalemated`/`resigned`/`timedOut`
 * flags) rather than a single-value `PlayerState` stack.
 */
export class Game {
  private board: Board;
  private gameState: GameState;
  private history: Move[];
  private movedPieces = new Set<string>();
  private players: Player[];
  private capturedPieces = new Map<string, CapturedPiece>();
  private positionCounts = new Map<string, number>();

  /**
   * Creates a game.
   *
   * @param ruleSet - The rules engine governing this game variant.
   * @param initialPieces - Optional board setup (see {@link BoardSetup}).
   * Omit this argument to use the standard four-player starting setup.
   * @param history - Optional initial move history. Copied but not
   * replayed; see prior remarks on this parameter's limited scope.
   */
  constructor(
    private ruleSet: RuleSet,
    initialPieces?: BoardSetup,
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

  public destroy(): void {
    this.history.length = 0;
    this.movedPieces.clear();
  }

  public addMoveToHistory(move: Move): void {
    this.history.push(move);
  }

  public addMovedPiece(id: string): void {
    this.movedPieces.add(id);
  }

  public addCapturedPiece(id: string, captured: CapturedPiece): void {
    this.capturedPieces.set(id, captured);
  }

  public applyMove(move: Move): boolean {
    return this.ruleSet.applyMove(move, this);
  }

  public advanceTurn(move?: Move): boolean {
    return this.ruleSet.advanceTurn(this, move);
  }

  public claimVictory(player: Color): boolean {
    return this.ruleSet.claimVictory(player, this);
  }

  /**
   * Returns the current position as a read-only view.
   *
   * @remarks
   * This never exposes a mutable `Board` — mutating board state outside
   * of {@link Game.advanceTurn}/{@link Game.applyMove} would bypass turn
   * validation, move history, scoring, check state, and other ruleset
   * bookkeeping. The active {@link RuleSet} is the only code permitted
   * to mutate the underlying board directly.
   */
  public getBoard(): ReadonlyBoard {
    return this.board;
  }

  public getCapturedPiece(id: string): CapturedPiece | undefined {
    return this.capturedPieces.get(id);
  }

  public getHistory(): Move[] {
    return this.history.slice();
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getCurrentPlayerColor(): Color {
    return this.gameState.getCurrentPlayerColor();
  }

  public getPlayer(color: Color): Player {
    const player = this.players.find(p => p.getColor() === color);

    if (!player) {
      throw new Error(`Unknown player ${color}`);
    }

    return player;
  }

  /**
   * Returns a player's current status flags (check, checkmate,
   * stalemate, resignation, timeout).
   *
   * @param color - The player color to inspect.
   */
  public getPlayerStatus(color: Color): PlayerStatus {
    return this.gameState.getPlayerStatus(color);
  }

  public getPositionCount(positionKey: string): number {
    return this.positionCounts.get(positionKey) ?? 0;
  }

  public getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(pieceId, this);
  }

  public getMoveClock(): number {
    return this.gameState.getMoveClock();
  }

  public hasPieceMoved(pieceId: string): boolean {
    return this.movedPieces.has(pieceId);
  }

  public incrementMoveClock(): void {
    this.gameState.incrementMoveClock();
  }

  public incrementPlayerScore(color: Color, points: number): void {
    const playerIndex = this.players.findIndex(p => p.getColor() === color);
    this.players[playerIndex].incrementScore(points);
  }

  public incrementPositionCount(positionKey: string): void {
    const n = this.positionCounts.get(positionKey) ?? 0;
    this.positionCounts.set(positionKey, n + 1);
  }

  public isOver(): boolean {
    return this.gameState.getStatus() === GameStatus.OVER;
  }

  /**
   * Checks whether a player is currently active in the game — i.e. not
   * checkmated, not stalemated, and not resigned/timed-out. Being in
   * check does not, by itself, make a player inactive.
   */
  public isPlayerActive(color: Color): boolean {
    const status = this.gameState.getPlayerStatus(color);

    return (!status.checkmated && !status.stalemated 
      && !status.resigned && !status.timedOut
    );
  }

  /** Checks whether a player's king is currently in check. */
  public isPlayerInCheck(color: Color): boolean {
    return this.gameState.getPlayerStatus(color).inCheck;
  }

  /** Checks whether a player has been checkmated. */
  public isPlayerCheckMated(color: Color): boolean {
    return this.gameState.getPlayerStatus(color).checkmated;
  }

  /** Checks whether a player has been stalemated. */
  public isPlayerStalled(color: Color): boolean {
    return this.gameState.getPlayerStatus(color).stalemated;
  }

  /** Checks whether a player has resigned or timed out. */
  public isPlayerResignedOrTimedOut(color: Color): boolean {
    const status = this.gameState.getPlayerStatus(color);

    return status.resigned || status.timedOut;
  }

  public getNextPlayerColor(previous: Color): Color {
    return NEXT_PLAYER_COLOR.get(previous)!;
  }

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

  public rankPlayersByScore(): Player[] {
    return [...this.players].sort((a, b) => b.getScore() - a.getScore());
  }

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
  public resignPlayer(color: Color, keepKingActive: boolean = false): void {
    this.gameState.updatePlayerStatus(color, { resigned: true });
    this.setPlayerInactive(color, keepKingActive);
  }

  /**
   * Marks a player as timed out and deactivates their pieces. Mirrors
   * {@link Game.resignPlayer} for the timeout forfeit case.
   *
   * @param color - The player who timed out.
   * @param keepKingActive - If `true`, only non-king pieces are
   * deactivated, allowing the king to remain active for the ruleset's
   * timed-out-player handling.
   */
  public timeOutPlayer(color: Color, keepKingActive: boolean = false): void {
    this.gameState.updatePlayerStatus(color, { timedOut: true });
    this.setPlayerInactive(color, keepKingActive);
  }

  public advanceCurrentPlayer(): void {
    this.gameState.setCurrentPlayerColor(
      this.getNextPlayerColor(this.getCurrentPlayerColor())
    );
  }

  public setGameStatus(status: GameStatus): void {
    this.gameState.setStatus(status);
  }

  /** Sets whether a player's king is currently in check. */
  public setPlayerInCheck(color: Color, inCheck: boolean): void {
    this.gameState.updatePlayerStatus(color, { inCheck });
  }

  /** Marks a player as checkmated. Idempotent. */
  public setPlayerCheckmated(color: Color): void {
    this.gameState.updatePlayerStatus(color, { checkmated: true });
  }

  /** Marks a player as stalemated. Idempotent. */
  public setPlayerStalemated(color: Color): void {
    this.gameState.updatePlayerStatus(color, { stalemated: true });
  }

  /**
   * Deactivates a player's pieces on the board.
   *
   * @param color - The player whose pieces should be deactivated.
   * @param keepKingActive - If `true`, leave the king active while
   * deactivating the player's other pieces.
   */
  public setPlayerInactive(color: Color, keepKingActive: boolean = false): void {
    this.board.setPlayerPiecesInactive(color, keepKingActive);
  }
}