import { Board } from "../board/board";
import { Move } from "../moves/move";

export default class Game {
  private board: Board;
  private history: Move[];
  constructor() {
    this.board = new Board();
    this.history = [];
  }

  // clean up resources if needed
  destroy(): void {
    this.board.destroy();
    this.history.length = 0;
  }

  /*reset(): void {
    if (typeof (this.board as any).reset === "function") {
      // @ts-ignore
      (this.board as any).reset();
    } else {
      this.board = new Board();
    }
    this.history = [];
  }*/

  clone(): Game {
    const g = new Game();
    g.board = this.board.clone();
    g.history = this.history.slice();
    return g;
  }

  makeMove(move: Move): boolean {
    const result = this.board.movePiece(move.pieceId, move.to);
    if (result) {
      this.history.push(move);
      return true;
    }
    return false;
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

  /*getLegalMoves(): Move[] {
    if (typeof (this.board as any).generateLegalMoves === "function") {
      // @ts-ignore
      return (this.board as any).generateLegalMoves();
    }
    return [];
  }

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
