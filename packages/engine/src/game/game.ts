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

export class Game {
  private board: Board;
  private gameState: GameState;
  private history: Move[];
  private movedPieces = new Set<string>();
  private players: Player[];
  private capturedPieces = new Map<string, CapturedPiece>();
  private positionCounts = new Map<string, number>();

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

  public advanceTurn(move?: Move, resign: boolean = false): boolean {
    return this.ruleSet.advanceTurn(this, move, resign);
  }

  public claimVictory(player: Color): boolean {
    return this.ruleSet.claimVictory(player, this);
  }

  public getBoard(): Board {
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

  public getPlayerState(color: Color): PlayerState {
    return this.gameState.getPlayerState(color)!;
  }

  public getPlayerStates(color: Color): PlayerState[] {
    return this.gameState.getPlayerStates(color);
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

  public hasPlayerState(color: Color, state: PlayerState): boolean {
    return this.gameState.hasPlayerState(color, state);
  }

  public incrementMoveClock(): void {
    this.gameState.incrementMoveClock();
  }

  public incrementPlayerScore(color: Color, points: number): void {
    const playerIndex = this.players.findIndex(
      p => p.getColor() === color
    );
    this.players[playerIndex].incrementScore(points);
  }

  public incrementPositionCount(positionKey: string): void {
    const n = this.positionCounts.get(positionKey)! ?? 0;
    this.positionCounts.set(positionKey, n + 1);
  }

  public isOver(): boolean {
    return this.gameState.getStatus() === GameStatus.OVER;
  }

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

  public isPlayerCheckMated(color: Color): boolean {
    return this.hasPlayerState(color, PlayerState.CHECKMATE);
  }

  public isPlayerStalled(color: Color): boolean {
    return this.hasPlayerState(color, PlayerState.STALEMATE);
  }

  public isPlayerResignedOrTimedOut(color: Color): boolean {
    return (
      this.hasPlayerState(color, PlayerState.RESIGNED) ||
      this.hasPlayerState(color, PlayerState.TIMED_OUT)
    );
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
    return this.players.sort((a, b) => 
      b.getScore() - a.getScore());
  }

  public resetMoveClock(): void {
    this.gameState.resetMoveClock();
  }

  public advanceCurrentPlayer(): void {
    this.gameState.setCurrentPlayerColor(
      this.getNextPlayerColor(this.getCurrentPlayerColor())
    );
  }

  public setGameStatus(status: GameStatus): void {
    this.gameState.setStatus(status);
  }

  public setPlayerState(color: Color, state: PlayerState): void {
    this.gameState.setPlayerState(color, state);
  }

  public setPlayerInactive(
    color: Color,
    keepKingActive: boolean = false
  ): void {
    this.board.setPlayerPiecesInactive(color, keepKingActive);
  }
}
