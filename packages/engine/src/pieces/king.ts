import { Piece } from "./piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";;
import { Board } from "../board/board";

export class King extends Piece {
  constructor(id: string, color: PlayerColor, position: Position | null) {
    super(id, color, PieceType.KING, position);
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
        const newRow = position.row + rowOffset;
        const newCol = String.fromCharCode(position.col.charCodeAt(0) + colOffset);
        const newPosition = { row: newRow, col: newCol };
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
