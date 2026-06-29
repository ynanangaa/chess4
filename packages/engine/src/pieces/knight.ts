import { DuplicatePiece } from "./duplicate-piece";
import { Position } from "../position/position";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Board } from "../board/board";

export class Knight extends DuplicatePiece {
  constructor(color: PlayerColor, kingSide: boolean) {
    super(color, PieceType.KNIGHT, kingSide);
    switch(this.color) {
      case PlayerColor.RED:
        this.position = {row: 1, col: kingSide ? 'j': 'e'};
        break;
      case PlayerColor.YELLOW:
        this.position = {row: 14, col: kingSide ? 'e': 'j'};
        break;
      case PlayerColor.BLUE:
        this.position = {row: kingSide ? 10: 5, col: 'a'};
        break;
      case PlayerColor.GREEN:
        this.position = {row: kingSide ? 5: 10, col: 'n'};
        break;
    }
  }

  public getPseudoLegalMoves(board: Board): Position[] {
    // Knight moves in an L shape: two squares along one axis and one square perpendicular.
    // It can jump over other pieces, so only the destination square matters.
    // The destination is legal if it is on the board and not occupied by a friendly piece.
    // Opponent-occupied squares are valid capture targets.
    const position = this.getPosition();
    if (!position) return [];

    const moves: Position[] = [];
    const knightMoves: Position[] = [
      board.translatePosition(position, -2, -1),
      board.translatePosition(position, -2, 1),
      board.translatePosition(position, -1, -2),
      board.translatePosition(position, -1, 2),
      board.translatePosition(position, 1, -2),
      board.translatePosition(position, 1, 2),
      board.translatePosition(position, 2, -1),
      board.translatePosition(position, 2, 1)
    ];

    for (const move of knightMoves) {
      if (!board.isValidPosition(move)) continue;
      const occupant = board.getPieceAt(move);
      if (!occupant || occupant.getColor() !== this.getColor()) {
        moves.push(move);
      }
    }

    return moves;
  }
}
