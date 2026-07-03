import { RuleSet } from "./rule-set";
import { Game, GameState } from "../game";
import { forwardDirectionOffsets, Move, MoveGenerator } from "../moves";
import { Color, Piece, PieceType, SquareCoords } from "../types";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { Board } from "../board";

export class ClassicRuleSet implements RuleSet {

    constructor(
        private readonly moveGenerator: MoveGenerator
    ) { }

    isValidMove(move: Move): boolean {
        // Implement the logic to check if the move is valid according to classic chess rules
        return true; // Placeholder implementation
    }

    getCurrentPlayer(game: Game): Color {
        // Implement the logic to get the current player color in the game
        return Color.RED; // Placeholder implementation
    }

    getLegalMoves(game: Game, pieceId: string): Move[] {
        const board = game.getBoard();
        const selectedPiece = board.getPiece(pieceId);
        if (!selectedPiece) return [];
        const from = board.getPositionOf(pieceId)!;

        const pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(pieceId, board);
        const legalPawnSquares = selectedPiece.type === PieceType.PAWN
            ? this.getPawnLegalSquares(board, selectedPiece, pseudoLegalMoves, from)
            : pseudoLegalMoves;

        return legalPawnSquares.map(to => 
            this.moveGenerator.buildMove(pieceId, from, to)
        );
    }

    private getPawnLegalSquares(board: Board, pawn: Piece, pseudoLegalMoves: number[], from: number): number[] {
        const legalSquares = [...pseudoLegalMoves];
        const direction = forwardDirectionOffsets(pawn.color);

        if (this.canDoubleSteps(board, pawn.color, pawn.id)) {
            const oneStepSquare = from + direction;
            const doubleStepSquare = oneStepSquare + direction;

            if (
                board.isValidSquare(oneStepSquare) &&
                board.isValidSquare(doubleStepSquare) &&
                !board.isOccupied(oneStepSquare) &&
                !board.isOccupied(doubleStepSquare)
            ) {
                legalSquares.push(doubleStepSquare);
            }
        }

        return legalSquares;
    }

    canCastle(board: Board, player: Color, kingSide: boolean): boolean {
        // Implement the logic to check if the king of the given player can castle on the given side
        return false; // Placeholder implementation
    }

    canDoubleSteps(board: Board, player: Color, pawnId: string): boolean {
        const pawnPos = board.getPositionOf(pawnId)!;

        switch (player) {
            case Color.RED:
                return pawnPos % 14 + 1 === 2;
            case Color.YELLOW:
                return pawnPos % 14 + 1 === 13;
            case Color.BLUE:
                return Math.trunc(pawnPos / 14) + 1 === 2;
            case Color.GREEN:
                return Math.trunc(pawnPos / 14) + 1 === 13;
            default:
                return false;
        }
    }

    canEnPassant(board: Board, pawnId: string): boolean {
        const pawnPos = board.getPositionOf(pawnId)!;

        return EN_PASSANT_SQUARES_IDS.has(pawnPos);
    }

    getGameState(game: Game): GameState {
        // Implement the logic to determine the game state (e.g., ongoing, check, checkmate, stalemate)
        return new GameState() ; // Placeholder implementation
    }
}