import { RuleSet } from "./rule-set";
import { Game, GameState } from "../game";
import { Move, MoveGenerator } from "../moves";
import { Color, SquareCoords } from "../types";
import { Pawn } from "../pieces/pawn";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { inverseParseCol, parseSquare, parseSquareId } from "../utils";

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
        const pieceSquare = board.getSquareOfPiece(pieceId);
        const selectedPiece = pieceSquare?.occupant;
        if (!selectedPiece) return [];

        const from = pieceSquare.coords;
        if (!from) return [];

        const pseudoLegalMoves = selectedPiece.getStandardMoves(game.getBoard());
        const legalSquares = selectedPiece instanceof Pawn
            ? this.getPawnLegalSquares(game, selectedPiece, pseudoLegalMoves, from)
            : pseudoLegalMoves;

        return legalSquares.map(to => 
            ({ pieceId: pieceId,
                from: pieceSquare.id,
                to: parseSquareId(
                    to.row, 
                    inverseParseCol(to.col)
                )
            })
        );
    }

    private getPawnLegalSquares(game: Game, pawn: Pawn, pseudoLegalMoves: SquareCoords[], from: SquareCoords): SquareCoords[] {
        const legalSquares = [...pseudoLegalMoves];
        const direction = pawn.getForwardDirection();

        if (this.canDoubleSteps(game, pawn.getColor(), pawn.getId())) {
            const oneStepSquare = parseSquare(
                from.row + direction.rowDelta,
                inverseParseCol(from.col) + direction.colDelta
            );
            const doubleStepSquare = parseSquare(
                oneStepSquare.coords.row + direction.rowDelta,
                inverseParseCol(oneStepSquare.coords.col) + direction.colDelta
            );

            if (
                game.getBoard().squareExists(oneStepSquare.id) &&
                game.getBoard().squareExists(doubleStepSquare.id) &&
                !game.getBoard().isOccupied(oneStepSquare.id) &&
                !game.getBoard().isOccupied(doubleStepSquare.id)
            ) {
                legalSquares.push(doubleStepSquare.coords);
            }
        }

        return legalSquares;
    }

    canCastle(game: Game, player: Color, kingSide: boolean): boolean {
        // Implement the logic to check if the king of the given player can castle on the given side
        return false; // Placeholder implementation
    }

    canDoubleSteps(game: Game, player: Color, pawnId: string): boolean {
        const board = game.getBoard();
        const pawnSquare = board.getSquareOfPiece(pawnId);
        const pawn = pawnSquare?.occupant;
        const coords = board.getCoordsOf(pawn!);

        if (!coords) return false;

        switch (player) {
            case Color.RED:
                return coords.row === 2;
            case Color.YELLOW:
                return coords.row === 13;
            case Color.BLUE:
                return coords.col === 'b';
            case Color.GREEN:
                return coords.col === 'm';
            default:
                return false;
        }
    }

    canEnPassant(game: Game, pawnId: string): boolean {
        const board = game.getBoard();
        const pawnSquare = board.getSquareOfPiece(pawnId);
        const pawn = pawnSquare?.occupant;

        if (!pawnSquare) return false;

        return EN_PASSANT_SQUARES_IDS.has(pawnSquare.id);
    }

    getGameState(game: Game): GameState {
        // Implement the logic to determine the game state (e.g., ongoing, check, checkmate, stalemate)
        return new GameState() ; // Placeholder implementation
    }
}