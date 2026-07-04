import { Board } from "../board";
import { Color, Piece, PieceType } from "../types";
import { Move } from "./move";
import { pawnMoves } from "./pawn-moves";
import { queenMoves } from "./queen-moves";
import { rookMoves } from "./rook-moves";
import { bishopMoves } from "./bishop-moves";
import { knightMoves } from "./knight-moves";
import { kingMoves } from "./king-moves";

export class MoveGenerator {

    public buildMove(
        pieceId: string,
        from: number,
        destination: number,
        castle?: "kingside" | "queenside",
        enPassant?: true
    ): Move {
        return {
            pieceId: pieceId,
            from: from,
            to: destination,
            castle: castle,
            enPassant: enPassant
        };
    }

    // Generate moves for a specific piece on the board
    public generateMovesForPiece(
        piece: Piece,
        board: Board
    ): number[] {
        const piecePosition = board.getPositionOf(piece.id)!;
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

    public generateAllOpponentsMoves(
        board: Board,
        color: Color
    ): Set<number> {

        const opponentsMoves: Set<number> = new Set();
        // Filter to keep opponents colors
        const oppColors = [
            Color.RED,
            Color.BLUE,
            Color.YELLOW,
            Color.GREEN
        ].filter(c => c !== color);

        for (const c of oppColors) {
            const oppMoves = this.generatePseudoLegalMoves(board, c);
            for (const move of oppMoves) {
                opponentsMoves.add(move.to);
            }

        }
        return opponentsMoves;
    }

    public generatePseudoLegalMoves(
        board: Board,
        color: Color
    ): Move[] {
        const moves: Move[] = [];

        // Get all the pieces and squares of given player color 
        const colorSquares = board.getOccupiedSquaresByColor(color);

        // Add all the pseudo legal moves from every piece in the resulting array
        for (const [squareId, pieceId] of colorSquares) {
            const piece = board.getPiece(pieceId);
            if (!piece) continue;

            const pseudoLegalMoves = this.generateMovesForPiece(piece, board);
            for (const destination of pseudoLegalMoves) {
                moves.push(this.buildMove(pieceId, squareId, destination));
            }
        }

        return moves;
    }

}