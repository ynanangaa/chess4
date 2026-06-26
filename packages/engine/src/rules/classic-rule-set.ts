import { RuleSet } from "./rule-set";
import { Game } from "../game/game";
import { Move } from "../moves/move";
import { PlayerColor } from "../players/player-color";
import { GameState } from "../states/game-state";
import { MoveGenerator } from "../moves/move-generator";
import { Position } from "../position/position";
import { Pawn } from "../pieces/pawn";
import { EN_PASSANT_SQUARES } from "./en-passant-squares";

export class ClassicRuleSet implements RuleSet {

    constructor(
        private readonly moveGenerator: MoveGenerator
    ) { }

    isValidMove(move: Move): boolean {
        // Implement the logic to check if the move is valid according to classic chess rules
        return true; // Placeholder implementation
    }

    getCurrentPlayer(game: Game): PlayerColor {
        // Implement the logic to get the current player color in the game
        return PlayerColor.RED; // Placeholder implementation
    }

    getLegalMoves(game: Game, pieceId: string): Move[] {
        const selectedPiece = game.getBoard().getPiece(pieceId);
        if (!selectedPiece) return [];

        const from = selectedPiece.getPosition();
        if (!from) return [];

        const pseudoLegalMoves = selectedPiece.getPseudoLegalMoves(game.getBoard());
        const legalPositions = selectedPiece instanceof Pawn
            ? this.getPawnLegalPositions(game, selectedPiece, pseudoLegalMoves, from)
            : pseudoLegalMoves;

        return legalPositions.map(to => ({ pieceId, from, to }));
    }

    private getPawnLegalPositions(game: Game, pawn: Pawn, pseudoLegalMoves: Position[], from: Position): Position[] {
        const legalPositions = [...pseudoLegalMoves];
        const direction = pawn.getForwardDirection();

        if (this.canDoubleSteps(game, pawn.getColor(), pawn.getId())) {
            const oneStepPosition = game.getBoard().translatePosition(from, direction.rowDelta, direction.colDelta);
            const doubleStepPosition = game.getBoard().translatePosition(oneStepPosition, direction.rowDelta, direction.colDelta);

            if (
                game.getBoard().isValidPosition(oneStepPosition) &&
                game.getBoard().isValidPosition(doubleStepPosition) &&
                !game.getBoard().isOccupied(oneStepPosition) &&
                !game.getBoard().isOccupied(doubleStepPosition)
            ) {
                legalPositions.push(doubleStepPosition);
            }
        }

        return legalPositions;
    }

    canCastle(game: Game, player: PlayerColor, kingSide: boolean): boolean {
        // Implement the logic to check if the king of the given player can castle on the given side
        return false; // Placeholder implementation
    }

    canDoubleSteps(game: Game, player: PlayerColor, pawnId: string): boolean {
        const pawn = game.getBoard().getPiece(pawnId);
        const position = pawn?.getPosition();

        if (!position) return false;

        switch (player) {
            case PlayerColor.RED:
                return position.row === 2;
            case PlayerColor.YELLOW:
                return position.row === 13;
            case PlayerColor.BLUE:
                return position.col === 'b';
            case PlayerColor.GREEN:
                return position.col === 'm';
            default:
                return false;
        }
    }

    canEnPassant(game: Game, pawnId: string): boolean {
        const pawn = game.getBoard().getPiece(pawnId);
        const position = pawn?.getPosition();

        if (!position) return false;

        return EN_PASSANT_SQUARES.has(`${position.col}${position.row}`);
    }

    getGameState(game: Game): GameState {
        // Implement the logic to determine the game state (e.g., ongoing, check, checkmate, stalemate)
        return new GameState() ; // Placeholder implementation
    }
}