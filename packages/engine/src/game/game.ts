import { Board } from "../board";
import { Move } from "../moves";
import { Player } from "../players";
import { RuleSet } from "../rules";
import { Color, Piece } from "../types";
import { GameState } from "./game-state";

const NEXT_PLAYER_COLOR = new Map<Color, Color>([
  [Color.RED, Color.BLUE],
  [Color.BLUE, Color.YELLOW],
  [Color.YELLOW, Color.GREEN],
  [Color.GREEN, Color.RED]
]);

export class Game {
  private board: Board;
  private history: Move[];
  private movedPieces = new Set<string>();
  private players: Player[];
  private gameState: GameState;

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

  public applyMove(move: Move): boolean {
    return this.ruleSet.applyMove(move, this);
  }

  public getBoard(): Board {
    return this.board;
  }

  public getHistory(): Move[] {
    return this.history.slice();
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getCurrentPlayerColor(): Color {
    if (this.history.length === 0) return Color.RED;

    const lastMove = this.history[this.history.length - 1];
    const previousColor = this.board.getPiece(lastMove.pieceId)!.color;

    return NEXT_PLAYER_COLOR.get(previousColor)!;
  }

  public getPlayer(color: Color): Player {
      const player = this.players.find(p => p.getColor() === color);

      if (!player) {
          throw new Error(`Unknown player ${color}`);
      }

      return player;
  }

  public getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(pieceId, this);
  }

  public hasPieceMoved(pieceId: string): boolean {
    return this.movedPieces.has(pieceId);
  }
}
