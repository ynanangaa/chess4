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
    // Game starts with RED by default
    if (this.history.length === 0) return Color.RED;

    const lastMove = this.history[this.history.length - 1];
    const previousColor = this.board.getPiece(lastMove.pieceId)!.color;

    return this.getNextPlayerColor(previousColor);
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

  public getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(pieceId, this);
  }

  public hasPieceMoved(pieceId: string): boolean {
    return this.movedPieces.has(pieceId);
  }

  public incrementPlayerScore(color: Color, points: number): void {
    const playerIndex = this.players.findIndex(
      p => p.getColor() === color
    );
    this.players[playerIndex].incrementScore(points);
  }

  public isPlayerActive(color: Color): boolean {
    const isActive = 
      this.getPlayerState(color) === PlayerState.NORMAL ||
      this.getPlayerState(color) === PlayerState.CHECK;
    return isActive;
  }

  public isPlayerCheckMated(color: Color): boolean {
    return this.getPlayerState(color) === PlayerState.CHECKMATE;
  }

  public isPlayerStalled(color: Color): boolean {
    return this.ruleSet.isPlayerStalled(color, this);
  }

  public isPlayerResignedOrTimedOut(color: Color): boolean {
    const resignedOrTimedOut = 
      this.getPlayerState(color) === PlayerState.RESIGNED ||
      this.getPlayerState(color) === PlayerState.TIMED_OUT;
    return resignedOrTimedOut;
  }

  public getNextPlayerColor(previous: Color): Color {
    let next = NEXT_PLAYER_COLOR.get(previous)!;
    while(!this.isPlayerActive(next))
      next = NEXT_PLAYER_COLOR.get(next)!;
    return next;
  }

  public rankPlayersByScore(): Player[] {
    return this.players.sort((a, b) => 
      b.getScore() - a.getScore());
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
