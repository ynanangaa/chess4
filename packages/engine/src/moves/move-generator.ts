import { Piece } from "../pieces/piece";
import { Position } from "../position/position";
import { Move } from "./move";
import { Board } from "../board/board";
import { PlayerColor } from "../players/player-color";

export class MoveGenerator {

    private buildMove(piece: Piece, destination: Position): Move {
        return {
            pieceId: piece.getId(),
            from: piece.getPosition(),
            to: destination,
        };
    }

    public generatePseudoLegalMoves(
        board: Board,
        color: PlayerColor
    ): Move[] {
        const moves: Move[] = [];

        // Get all the pieces from the given player color
        const pieces = board.getPieces().filter(
            piece => piece.getColor() === color && piece.getPosition() !== null
        );

        // Add all the pseudo legal moves from every piece in the resulting array
        for (const piece of pieces) {
            const source = piece.getPosition();
            if (!source) continue;

            const pseudoLegalMoves = piece.getPseudoLegalMoves(board);
            for (const destination of pseudoLegalMoves) {
                moves.push(this.buildMove(piece, destination));
            }
        }

        return moves;
    }

}