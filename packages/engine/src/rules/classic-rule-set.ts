import { RuleSet } from "./rule-set";
import { Game, GameState } from "../game";
import { castleDirectionOffset, forwardDirection, Move, MoveGenerator } from "../moves";
import { Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { Board } from "../board";
import { kingInitialSquareId, rookInitialSquareId } from "../utils";

export class ClassicRuleSet implements RuleSet {

    constructor(
        private readonly moveGenerator: MoveGenerator
    ) { }

    public getLegalMoves(pieceId: string, game: Game): Move[] {
        const board = game.getBoard();
        const selectedPiece = board.getPiece(pieceId);
        if (!selectedPiece) return [];

        const from = board.getPositionOf(pieceId)!;

        const gameState = game.getGameState();

        let pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(selectedPiece, board);
        const playerState = gameState.getPlayerState(selectedPiece.color)!;

        if (playerState === PlayerState.CHECKMATE ||
            PlayerState.STALEMATE)
            return [];

        let doubleStepMove: Move | undefined = undefined;
        let enpassantMove: Move | undefined = undefined;
        let promotionMove: Move | undefined = undefined;
        if (selectedPiece.type === PieceType.PAWN) {
            const doubleStep = this.getPawnDoubleStep(selectedPiece, from, board);
            if(doubleStep) doubleStepMove = doubleStep;
            const enPassant = this.getEnPassantMove(selectedPiece, from, game);
            if(enPassant) enpassantMove = enPassant;
            const promote = this.promotion(selectedPiece, from);
            if(promote) promotionMove = promote;
        }
        const castleMoves: Move[] = [];
        if (selectedPiece.type === PieceType.KING) {
            const castle = this.getCastleMoves(selectedPiece.color, game);
            castleMoves.push(...castle)

        }

        let moves = pseudoLegalMoves.map(to => 
            this.moveGenerator.buildMove(pieceId, from, to)
        );

        let allOpponentsMoves: Set<number> = new Set();

        let boardClone = board.clone();

        if(promotionMove) {
            moves = moves.map(m => promotionMove.to === m.to ? promotionMove: m)
        }
        if(doubleStepMove) moves.push(doubleStepMove);
        
        if(enpassantMove) moves.push(enpassantMove);

        moves.push(...castleMoves);

        // King moves filtering
        if (selectedPiece.type === PieceType.KING &&
            playerState !== PlayerState.CHECK
        ) {
            allOpponentsMoves = this.moveGenerator
                .generateAllOpponentsMoves(board, selectedPiece.color);
        }

        // Other pieces filtering
        if (playerState === PlayerState.CHECK) {
            const history = game.getHistory();

            for (const move of [
                history[history.length - 1],
                history[history.length - 2],
                history[history.length - 3]
            ]) {

                if (move?.check === undefined) continue;

                for (const [pieceId, _] of move.check!)
                    boardClone.removePiece(pieceId);

                allOpponentsMoves = this.moveGenerator
                    .generateAllOpponentsMoves(boardClone, selectedPiece.color);

                for (const [pieceId, colors] of move.check!) {
                    const attackerPos = board.getPositionOf(pieceId)!;

                    if (colors.includes(selectedPiece.color)) {
                        const attackRayToKing = this.getAttackRayToKing(
                            pieceId,
                            selectedPiece.color,
                            board
                        );

                        if (selectedPiece.type !== PieceType.KING) {
                            if (attackRayToKing.length === 0) {
                                // Cavalier : seule la capture de l'attaquant est possible
                                moves = moves.filter(m => m.to === attackerPos);
                            } else {
                                // Pièce glissante : interposition ou capture
                                moves = moves.filter(m =>
                                    attackRayToKing.includes(m.to)
                                );
                            }
                        } else {

                            const attacker = board.getPiece(pieceId)!;

                            const attackerMoves = 
                                new Set(this.moveGenerator
                                    .generateMovesForPiece(attacker, board)
                                );

                            moves = moves.filter(m => !attackerMoves.has(m.to));

                            let forbidden: number[];

                            if (attackRayToKing.length > 0) {
                                // Square just after the king on the attack line
                                forbidden =
                                    [attackRayToKing[attackRayToKing.length - 1]];

                            } else {
                                forbidden = [
                                    from - 15,
                                    from - 13,
                                    from + 13,
                                    from + 15
                                ]
                            }

                            // King must move to a safe square
                            moves = moves.filter(m => !forbidden.includes(m.to));
                        }
                    }
                }

            }
        }

        moves = moves.filter(m => !allOpponentsMoves.has(m.to));

        return moves;
    }

    private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
        const forward = forwardDirection(pawn.color);

        if (this.canDoubleSteps(pawn, from)) {
            const oneStepSquare = from + forward.rowDelta + 14 * forward.colDelta;
            const doubleStepSquare 
                = oneStepSquare + forward.rowDelta + 14 * forward.colDelta;

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
        if(game.getGameState().getPlayerState(player) === PlayerState.CHECK)
            return [];
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

    public canDoubleSteps(pawn: Piece, from: number): boolean {

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

    private canPromote(pawn: Piece, from: number): boolean {
        switch (pawn.color) {
            case Color.RED:
                return from % 14 + 1 === 7;
            case Color.YELLOW:
                return from % 14 + 1 === 8;
            case Color.BLUE:
                return Math.trunc(from / 14) + 1 === 7;
            case Color.GREEN:
                return Math.trunc(from / 14) + 1 === 8;
            default:
                return false;
        }
    }

    public promotion(pawn: Piece, from: number): Move | undefined {
        if(!this.canPromote(pawn, from)) return undefined;
        const forward = forwardDirection(pawn.color);
        return this.moveGenerator.buildMove(
            pawn.id, from, from + forward.rowDelta + 14 * forward.colDelta,
            undefined, 'promotion'
        )
    }

    public getCheckInfos(player: Color, game: Game): Map<string, Color[]> {
        const board = game.getBoard();

        const enemyKings = new Map<Color, number>();

        const checkInfos = new Map<string, Color[]>();

        for (const color of [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN]) {
            if (color === player) continue;

            const kingPos = board.getPositionOf(`K-${color}`);
            if (kingPos !== undefined)
                enemyKings.set(color, kingPos);
        }

        for (const piece of board.getPiecesByColor(player)) {

            const moves = new Set(
                this.moveGenerator.generateMovesForPiece(piece, board)
            );

            for (const [color, kingPos] of enemyKings) {
                    
                if (moves.has(kingPos))
                    if (checkInfos.has(piece.id)) {
                        const colorArr = checkInfos.get(piece.id)!;
                        colorArr.push(color);
                        checkInfos.set(piece.id, colorArr)
                    } else checkInfos.set(piece.id, [color]);
            }
        }

        return checkInfos;
    }

    private getAttackRayToKing(pieceId: string, kingColor: Color, board: Board): number[] {
        const kingPos = board.getPositionOf(`K-${kingColor}`);
        const attackerPos = board.getPositionOf(pieceId);

        if (kingPos === undefined || attackerPos === undefined) {
            return [];
        }

        const delta = kingPos - attackerPos;
        const absDelta = Math.abs(delta);

        let step = 0;

        if (absDelta < 13) step = 1;
        else if (absDelta % 14 === 0) step = 14;
        else if (absDelta % 15 === 0) step = 15;
        else if (absDelta % 13 === 0) step = 13;
        else return []; // no interposition path

        const direction = delta > 0 ? 1 : -1;
        const result: number[] = [];

        for (
            let pos = attackerPos;
            pos !== kingPos;
            pos += direction * step
        ) {
            result.push(pos);
        }

        // The square right after the king on the same attack line
        result.push(kingPos + direction * step);

        return result;
    }

    public updateGameState(game: Game): GameState {
        // Implement the logic to determine the game state (e.g., ongoing, check, checkmate, stalemate)
        const state = game.getGameState();
        if(state.getStatus() === GameStatus.RUNNING) {
            const history = game.getHistory();
            const lastMove = history[history.length - 1];

            const piecePlayed = game.getBoard().getPiece(lastMove.pieceId)!;
            const playerState = state.getPlayerState(piecePlayed.color);
            
            if(playerState === PlayerState.CHECK) {
                state.setPlayerState(piecePlayed.color, PlayerState.NORMAL);
            }

            const currentPlayerColor = game.getCurrentPlayerColor();

            if(lastMove.check !== undefined) {
                const kingColors: Color[] = [];
                const checkInfos = lastMove.check;
                for (const v of checkInfos.values())
                    kingColors.push(...v);
                for (const color of new Set(kingColors)) {
                    state.setPlayerState(color, PlayerState.CHECK);
                }
            }

            if (state.getPlayerState(currentPlayerColor) === PlayerState.CHECK &&
                this.isPlayerMate(currentPlayerColor, game)) {
                state.setPlayerState(currentPlayerColor, PlayerState.CHECKMATE);
            }

            if(state.getPlayerState(currentPlayerColor) === PlayerState.NORMAL &&
                this.isPlayerMate(currentPlayerColor, game)
            ) {
                state.setPlayerState(currentPlayerColor, PlayerState.STALEMATE);
            }

        }

        return state ; // Placeholder implementation
    }

    public isPlayerMate(player: Color, game: Game): boolean {
        const board = game.getBoard();
        const pieces = board.getPiecesByColor(player);
        for (const p of pieces) {
            const pieceLegalMoves = this.getLegalMoves(p.id, game);
            if (pieceLegalMoves.length > 0) {
                return false;
            }

        }
        return true;
    }
}