import { Board } from "../board";
import { Color, PieceType } from "../types";
import { Move } from "./move";
import { pawnMoves } from "./pawn-moves";
import { queenMoves } from "./queen-moves";
import { rookMoves } from "./rook-moves";
import { bishopMoves } from "./bishop-moves";
import { knightMoves } from "./knight-moves";
import { kingMoves } from "./king-moves";

export class MoveGenerator {

    public buildMove(pieceId: string, from: number, destination: number): Move {
        return {
            pieceId: pieceId,
            from: from,
            to: destination
        };
    }

    // Generate moves for a specific piece on the board
    public generateMovesForPiece(
        pieceId: string,
        board: Board
    ): number[] {
        const piecePosition = board.getPositionOf(pieceId);
        if (!piecePosition) return [];
        const piece = board.getPiece(pieceId)!;
        switch (piece.type) {
            case PieceType.KNIGHT:
                return knightMoves(piece, piecePosition, board);
            case PieceType.BISHOP:
                return bishopMoves(piece, board);
            case PieceType.ROOK:
                return rookMoves(piece, board);
            case PieceType.QUEEN:
                return queenMoves(piece, board);
            case PieceType.PAWN:
                return pawnMoves(piece, piecePosition, board);
            case PieceType.KING:
                return kingMoves(piece, piecePosition, board);
        }
    }

    public generatePseudoLegalMoves(
        board: Board,
        color: Color
    ): Move[] {
        const moves: Move[] = [];

        // Get all the occupied squares by the pieces of given player color 
        const squares = board.getOccupiedSquares();
        const colorSquares = Array.from(squares.entries()).filter(([squareId, pieceId]) => {
            const piece = board.getPiece(pieceId);
            return piece?.color === color;
        });

        // Add all the pseudo legal moves from every piece in the resulting array
        for (const [squareId, pieceId] of colorSquares) {
            const piece = board.getPiece(pieceId);
            if (!piece) continue;

            const pseudoLegalMoves = this.generateMovesForPiece(pieceId, board);
            for (const destination of pseudoLegalMoves) {
                moves.push(this.buildMove(pieceId, squareId, destination));
            }
        }

        return moves;
    }

}