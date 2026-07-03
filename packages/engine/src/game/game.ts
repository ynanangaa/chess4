import { Board } from "../board";
import { Move } from "../moves";
import { RuleSet } from "../rules";
import { Player } from "../players";
import { Color } from "../types";
import { GameState } from "./game-state";

export class Game {
  private board: Board;
  private history: Move[];
  private players: Player[] = [];
  private gameState: GameState;

  constructor(private ruleSet: RuleSet) {
    this.board = new Board();
    this.history = [];
    this.players = [
      new Player("P1", Color.RED),
      new Player("P2", Color.BLUE),
      new Player("P3", Color.YELLOW),
      new Player("P4", Color.GREEN),
    ];
    this.gameState = new GameState();
  }

  // clean up resources if needed
  destroy(): void {
    //this.board.destroy();
    this.history.length = 0;
  }

  /*clone(): Game {
    const g = new Game(this.ruleSet);
    g.board = this.board.clone();
    g.history = this.history.slice();
    return g;
  }*/

  private updateGameStatus(): void {
    this.gameState = this.ruleSet.getGameState(this);
  }

  applyMove(move: Move): boolean {
    const result = this.board.placePiece(move.pieceId, move.to);
    if (result) {
      this.history.push(move);
      this.updateGameStatus();
      return true;
    }
    return false;
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
    // determine current player based on history length of a 4-player game
    const colors = this.players.map(player => player.getColor());
    return colors[this.history.length % colors.length];
  }

  getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(this, pieceId);
  }

  /*undo(): Move | null {
    if (this.history.length === 0) return null;
    const mv = this.history.pop() as Move;
    if (typeof (this.board as any).undoMove === "function") {
      // @ts-ignore
      (this.board as any).undoMove(mv);
    } else if (typeof (this.board as any).setPosition === "function") {
      // no-op: caller should restore via clone/previous state
    }
    return mv;
  }*/

  /*

  isGameOver(): boolean {
    // try common board methods
    // @ts-ignore
    if (typeof (this.board as any).isCheckmate === "function") return (this.board as any).isCheckmate();
    // @ts-ignore
    if (typeof (this.board as any).isStalemate === "function") return (this.board as any).isStalemate();
    return false;
  }

  toString(): string {
    if (typeof (this.board as any).toString === "function") return (this.board as any).toString();
    return "Game(board)";
  }

  // convenience: export FEN if board supports it
  getFEN(): string | null {
    // @ts-ignore
    if (typeof (this.board as any).getFEN === "function") return (this.board as any).getFEN();
    return null;
  }*/
}
