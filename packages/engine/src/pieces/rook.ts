import { DuplicatePiece } from "./duplicate-piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";

export class Rook extends DuplicatePiece {
  constructor(color: PlayerColor, kingSide: boolean) {
    super(color, PieceType.ROOK, kingSide);
    switch(this.color) {
      case PlayerColor.RED:
        this.position = {row: 1, col: kingSide ? 'k': 'd'};
        break;
      case PlayerColor.YELLOW:
        this.position = {row: 14, col: kingSide ? 'd': 'k'};
        break;
      case PlayerColor.BLUE:
        this.position = {row: kingSide ? 11: 4, col: 'a'};
        break;
      case PlayerColor.GREEN:
        this.position = {row: kingSide ? 4: 11, col: 'n'};
        break;
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Rook moves horizontally or vertically across the board.
    // It continues moving square-by-square until it hits the edge or a piece.
    // It can capture an opponent on the first occupied square in a direction.
    // It cannot move beyond any blocking piece.
    const position = this.getPosition();
    if (!position) return [];

    return this.getSlidingDirections(board, [
        { rowDelta: -1, colDelta: 0 }, // down
        { rowDelta: 1, colDelta: 0 },  // up
        { rowDelta: 0, colDelta: -1 }, // left
        { rowDelta: 0, colDelta: 1 }   // right
    ]);
  }
}
