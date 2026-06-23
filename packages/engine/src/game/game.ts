import { Board } from "../board/board";
import { Move } from "../moves/move";
import { RuleSet } from "../rules/rule-set";

export class Game implements RuleSet {
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

  addMove(move: Move): boolean {
    const result = this.board.movePiece(move.pieceId, move.to);
    if (result) {
      this.history.push(move);
      return true;
    }
    return false;
  }

  getBoard(): Board {
    return this.board;
  }

  getHistory(): Move[] {
    return this.history.slice();
  }

  getCurrentPlayerColor(): string {
    // determine current player based on history length of a 4-player game
    const colors = ["red", "blue", "yellow", "green"];
    return colors[this.history.length % colors.length];
  }

  getLegalMoves(pieceId: string): Move[] {
    const selectedPiece = this.board.getPiece(pieceId);
    if (!selectedPiece) return [];
    let newPositions: Move[] = []
    // Get legal moves according to the piece type and current game state
    const selectedPieceType = selectedPiece.type;
    if (selectedPieceType === "P") {
      // if the pawn has not moved yet, it can move two squares forward
      const count = selectedPiece.position!.row === 2 ? 2 : 1;;
      // if the current player is red or green, the move follows the column
      if (selectedPiece.color === "red" || selectedPiece.color === "green") {
        const newCol = selectedPiece.position!.col;
        for (let i = 1; i <= count; i++) {
          const newRow = selectedPiece.position!.row + i;
          newPositions.push({ pieceId, from: selectedPiece.position, to: { row: newRow, col: newCol } });
        }
      } else { // if the current player is blue or yellow, the move follows the row
        const newRow = selectedPiece.position!.row;
        for (let i = 1; i <= count; i++) {
          const newCol = String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) + i);
          newPositions.push({ pieceId, from: selectedPiece.position, to: { row: newRow, col: newCol } });
        }
      }
    } else if (selectedPieceType === "N") {
      // Knight moves in an L shape: two squares in one direction and then one square perpendicular

      const knightMoves = [
        { row: selectedPiece.position!.row - 2, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) - 1) },
        { row: selectedPiece.position!.row - 2, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) + 1) },
        { row: selectedPiece.position!.row - 1, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) - 2) },
        { row: selectedPiece.position!.row - 1, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) + 2) },
        { row: selectedPiece.position!.row + 1, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) - 2) },
        { row: selectedPiece.position!.row + 1, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) + 2) },
        { row: selectedPiece.position!.row + 2, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) - 1) },
        { row: selectedPiece.position!.row + 2, col: String.fromCharCode(selectedPiece.position!.col.charCodeAt(0) + 1) }
      ];
      for (const move of knightMoves) {
        newPositions.push({ pieceId, from: selectedPiece.position, to: move });
      }
    } else if (selectedPieceType === "B") {
      // Bishop moves diagonally in any direction while it does not encounter another piece
    return newPositions;

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
