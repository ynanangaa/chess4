import { Piece } from "./piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";;
import { Board } from "../board/board";

export class King extends Piece {
  constructor(color: PlayerColor) {
    super(color, PieceType.KING);
    switch(this.color) {
      case PlayerColor.RED:
        this.position = {row: 1, col: 'h'};
        break;
      case PlayerColor.YELLOW:
        this.position = {row: 14, col: 'g'};
        break;
      case PlayerColor.BLUE:
        this.position = {row: 8, col: 'a'};
        break;
      case PlayerColor.GREEN:
        this.position = {row: 7, col: 'n'};
        break;
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // King moves one square in any of the eight surrounding directions.
    // It may move onto an empty square or capture an opposing piece.
    // It cannot move onto a square occupied by a friendly piece.
    const position = this.getPosition();
    if (!position) return [];

    const moves: Position[] = [];
    const directionOffsets = [-1, 0, 1];

    for (const rowOffset of directionOffsets) {
      for (const colOffset of directionOffsets) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const newPosition = board.translatePosition(position, rowOffset, colOffset);
        if (!board.isValidPosition(newPosition)) continue;
        const occupant = board.getPieceAt(newPosition);
        if (!occupant || occupant.getColor() !== this.getColor()) {
          moves.push(newPosition);
        }
      }
    }

    return moves;
  }
}
