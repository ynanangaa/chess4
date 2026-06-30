import { Board } from "../board";
import { Color, SquareCoords } from "../types";
import { Piece } from "../pieces";
import { Move } from "./move";
import { inverseParseCol, parseSquareId } from "../utils";

export class MoveGenerator {

    private buildMove(board: Board, piece: Piece, destination: SquareCoords): Move {
        const pieceCoords = board.getCoordsOf(piece);
        return {
            pieceId: piece.getId(),
            from: parseSquareId(
                pieceCoords!.row,
                inverseParseCol(pieceCoords!.col)
            ),
            to: parseSquareId(
                destination.row,
                inverseParseCol(destination.col)
            ),
        };
    }

    public generatePseudoLegalMoves(
        board: Board,
        color: Color
    ): Move[] {
        const moves: Move[] = [];

        // Get all the occupied squares by the pieces of given player color 
        const squares = board.getSquares().filter(
            sq => sq.occupant?.getColor() === color
        );

        // Add all the pseudo legal moves from every piece in the resulting array
        for (const square of squares) {

            const pseudoLegalMoves = square.occupant!.getStandardMoves(board);
            for (const destination of pseudoLegalMoves) {
                moves.push(this.buildMove(board, square.occupant!, destination));
            }
        }

        return moves;
    }

}