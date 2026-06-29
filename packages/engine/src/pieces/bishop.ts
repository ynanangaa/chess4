import { DuplicatePiece } from "./duplicate-piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";

export class Bishop extends DuplicatePiece {
  constructor(color: PlayerColor, kingSide: boolean) {
    super(color, PieceType.BISHOP, kingSide);
    switch(this.color) {
      case PlayerColor.RED:
        this.position = {row: 1, col: kingSide ? 'i': 'f'};
        break;
      case PlayerColor.YELLOW:
        this.position = {row: 14, col: kingSide ? 'f': 'i'};
        break;
      case PlayerColor.BLUE:
        this.position = {row: kingSide ? 9: 6, col: 'a'};
        break;
      case PlayerColor.GREEN:
        this.position = {row: kingSide ? 6: 9, col: 'n'};
        break;
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Bishop moves diagonally in any direction.
    // It continues stepping square-by-square until it goes off-board or encounters another piece.
    // If the encountered piece belongs to an opponent, that square is a legal capture target.
    // If the encountered piece is friendly, movement stops before that square.
    const position = this.getPosition();
    if (!position) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: -1 }, // bottom-left
        { rowDelta: -1, colDelta: 1 },  // bottom-right
        { rowDelta: 1, colDelta: -1 },  // top-left
        { rowDelta: 1, colDelta: 1 }   // top-right
    ]);
  }
}
