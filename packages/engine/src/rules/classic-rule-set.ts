import { RuleSet } from "./rule-set";
import { Game, GameState } from "../game";
import { castleDirectionOffset, forwardDirectionOffsets, Move, MoveGenerator } from "../moves";
import { Color, Piece, PieceType } from "../types";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { Board } from "../board";
import { kingInitialSquareId, parseSquareId, rookInitialSquareId } from "../utils";

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

    getLegalMoves(pieceId: string, game: Game): Move[] {
        const board = game.getBoard();
        const selectedPiece = board.getPiece(pieceId);
        if (!selectedPiece) return [];
        const from = board.getPositionOf(pieceId)!;

        const pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(selectedPiece, board);

        let doubleStepMove: Move | undefined = undefined;
        let enpassantMove: Move | undefined = undefined;
        if (selectedPiece.type === PieceType.PAWN) {
            const doubleStep = this.getPawnDoubleStep(selectedPiece, from, board);
            if(doubleStep) doubleStepMove = doubleStep;
            const enPassant = this.getEnPassantMove(selectedPiece, from, game);
            if(enPassant) enpassantMove = enPassant;
        }
        const castleMoves: Move[] = [];
        if (selectedPiece.type === PieceType.KING) {
            const castle = this.getCastleMoves(selectedPiece.color, game);
            castleMoves.push(...castle)

        }
        const moves = pseudoLegalMoves.map(to => 
            this.moveGenerator.buildMove(pieceId, from, to)
        );
        if(doubleStepMove) moves.push(doubleStepMove);
        if(enpassantMove) moves.push(enpassantMove);
        moves.push(...castleMoves);

        return moves;
    }

    private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
        const direction = forwardDirectionOffsets(pawn.color);

        if (this.canDoubleSteps(pawn, from, board)) {
            const oneStepSquare = from + direction;
            const doubleStepSquare = oneStepSquare + direction;

            if (
                board.isValidSquare(oneStepSquare) &&
                !board.isOccupied(oneStepSquare) &&
                board.isValidSquare(doubleStepSquare) &&
                !board.isOccupied(doubleStepSquare)
            ) {
                return this.moveGenerator.buildMove(
                    pawn.id, from, doubleStepSquare,
                    undefined, "doublestep"
                );
            }
        }

        return undefined;
    }

    public getCastleMoves(player: Color, game: Game): Move[] {
        const castle: Move[] = [];
        const board = game.getBoard();
        const hasKingMoved = game.hasPieceMoved(`K-${player}`);
        const from = board.getPositionOf(`K-${player}`)!;
        for (const kingSide of [true, false]) {
            const side = kingSide? "kingside": "queenside";
            const hasRookMoved = game.hasPieceMoved(
                `R-${player}-${side}`
            )
            const rookPos = board.getPositionOf(`R-${player}-${side}`)!
            if (from === kingInitialSquareId(player) && !hasKingMoved &&
                rookPos === rookInitialSquareId(player, kingSide) &&
                !hasRookMoved
                ) {
                const allOpponentsMoves = this.moveGenerator.generateAllOpponentsMoves(board, player);
                const direction = castleDirectionOffset(player, kingSide);
                const oneStep = from + direction;
                const doubleStep = oneStep + direction;
                if (!board.isOccupied(oneStep) &&
                    !allOpponentsMoves.has(oneStep) &&
                    !board.isOccupied(doubleStep) &&
                    !allOpponentsMoves.has(doubleStep)) {
                    castle.push(this.moveGenerator.buildMove(
                        `K-${player}`, from, doubleStep, side
                    ));
                }
            }
        }
        return castle;
    }

    public canDoubleSteps(pawn: Piece, from: number, board: Board): boolean {

        switch (pawn.color) {
            case Color.RED:
                return from % 14 + 1 === 2;
            case Color.YELLOW:
                return from % 14 + 1 === 13;
            case Color.BLUE:
                return Math.trunc(from / 14) + 1 === 2;
            case Color.GREEN:
                return Math.trunc(from / 14) + 1 === 13;
            default:
                return false;
        }
    }

    public getEnPassantMove(pawn: Piece, from: number, game: Game): Move | undefined {
        let enPassant: number | undefined = undefined;
        const gameHistory = game.getHistory();
        if(gameHistory.length !== 0) {
            const lastMove = gameHistory[gameHistory.length - 1];
            if(lastMove?.pawnSpecialMove === 'doublestep') {
                if (EN_PASSANT_SQUARES_IDS.has(from)) {
                    if (pawn.color === Color.RED || pawn.color === Color.YELLOW) {
                        if (lastMove.to === from - 14 ||
                            lastMove.to === from + 14)
                            enPassant = pawn.color === Color.RED 
                                ? lastMove.to + 1: lastMove.to - 1
                    } else {
                        if (lastMove.to === from - 1 ||
                            lastMove.to === from + 1)
                            enPassant = pawn.color === Color.BLUE 
                                ? lastMove.to + 14: lastMove.to - 14
                    }
                }
            }
        }
        if(!enPassant) return undefined;
        
        return this.moveGenerator.buildMove(pawn.id, from, enPassant, undefined, "e-p");
    }

    getGameState(game: Game): GameState {
        // Implement the logic to determine the game state (e.g., ongoing, check, checkmate, stalemate)
        return new GameState() ; // Placeholder implementation
    }
}