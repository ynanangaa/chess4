import { Board } from "../board";
import { Game, GameState } from "../game";
import { 
  castleDirectionOffset, 
  enPassantCapturedPawnSquare, 
  forwardDirection, 
  Move, 
  MoveGenerator,
  rookCastleDirectionOffset, 
} from "../moves";
import { Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { kingInitialSquareId, rookInitialSquareId } from "../utils";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { RuleSet } from "./rule-set";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export class DefaultRuleSet extends RuleSet {
  constructor(
    moveGenerator: MoveGenerator
  ) { super(moveGenerator); }

  public override applyMove(move: Move, game: Game): boolean {
    // Three stages

    // Stage 1 : Board (moves, captures, castle, promotion)
    const appliedMove = this.applyMoveOnBoard(move, game.getBoard());
    if (!appliedMove) return false;

    // Stage 2 : Game (history, moved pieces, check infos)
    const movedPiece = game.getBoard().getPiece(appliedMove.pieceId)!;

    game.addMovedPiece(appliedMove.pieceId);
    if (move.castle) {
        const color = movedPiece.color;
        game.addMovedPiece(`R-${color}-${move.castle}`);
    }
    this.recordMove(appliedMove, movedPiece.color, game);

    // Stage 3 : Rules (Game state update, points awarded)
    this.updateGameState(game);

    return true;
  }

  private applyMoveOnBoard(
    move: Move, 
    board: Board
  ): Move | undefined {
    let appliedMove = this.withDirectCapture(move, board);
    const movedPiece = board.placePiece(move.pieceId, move.to);
    if (!movedPiece) return undefined;

    appliedMove = this.applyEnPassantCapture(appliedMove, board);
    this.applyPromotion(move, board);
    this.applyCastling(move, board);

    return appliedMove;
  }

  private withDirectCapture(move: Move, board: Board): Move {
    const capturedPiece = board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  private applyEnPassantCapture(move: Move, board: Board): Move {
    const capturedPieceId = this.getCapturedPieceIdForEnPassant(move, board);
    if (!capturedPieceId) return move;

    board.removePiece(capturedPieceId);

    return { ...move, capture: capturedPieceId };
  }

  private getCapturedPieceIdForEnPassant(
    move: Move,
    board: Board
  ): string | undefined {
    if (move.pawnSpecialMove !== "e-p") return undefined;

    const movingPiece = board.getPiece(move.pieceId);
    if (!movingPiece || movingPiece.type !== PieceType.PAWN) return undefined;

    const capturedSquare = enPassantCapturedPawnSquare(move.to, movingPiece.color);
    const capturedPiece = board.getPieceAt(capturedSquare);
    if (!capturedPiece || capturedPiece.color === movingPiece.color) return undefined;

    return capturedPiece.id;
  }

  private applyPromotion(move: Move, board: Board): void {
    if (move.pawnSpecialMove === "promotion") {
      board.setPromotionPieceType(move.pieceId, PieceType.QUEEN);
    }
  }

  private applyCastling(move: Move, board: Board): void {
    if (!move.castle) return;

    const color = board.getPiece(move.pieceId)!.color;
    const rookId = `R-${color}-${move.castle}`;

    board.placePiece(
      rookId,
      move.to + rookCastleDirectionOffset(color, move.castle)
    );
  }

  private recordMove(move: Move, color: Color, game: Game): void {
    const checkInfos = this.getCheckInfos(color, game);

    game.addMoveToHistory(
      checkInfos.size > 0
        ? { ...move, check: checkInfos }
        : move
    );
  }

  public awardCapturePoints (_game: Game): number {

    const history = _game.getHistory();
    const lastMove = history[history.length - 1];
    const capturedPieceId = lastMove.capture;

    if (capturedPieceId === undefined) return 0;

    const board = _game.getBoard();
    const capturedPiece = board.getPiece(capturedPieceId)!;

    return capturedPiece.points? capturedPiece.points: 0;

  }

  public awardMultiCheckPoints(_game: Game): number {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];

    const checkInfos = lastMove.check;

    if (checkInfos === undefined) return 0;

    const checkedKings: Set<Color> = new Set(
      Array.from(checkInfos.values()).flat()
    )

    if (checkedKings.size < 2) return 0;

    const movedPiece = _game.getBoard().getPiece(lastMove.pieceId)!;

    switch(movedPiece.type) {
      case PieceType.QUEEN:
        return checkedKings.size === 2? 1: 5;
      default:
        return checkedKings.size === 2? 5: 20;
    }
  }

  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = game.getBoard();
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return [];

    const from = board.getPositionOf(pieceId)!;
    const playerState = game.getGameState().getPlayerState(selectedPiece.color)!;

    if (
      playerState === PlayerState.CHECKMATE ||
      playerState === PlayerState.STALEMATE
    ) {
      return [];
    }

    const pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(selectedPiece, board);
    let moves = pseudoLegalMoves.map(to =>
      this.moveGenerator.buildMove(pieceId, from, to)
    );

    if (selectedPiece.type === PieceType.PAWN) {
      moves = this.withPawnSpecialMoves(selectedPiece, from, game, moves);
    }

    if (selectedPiece.type === PieceType.KING) {
      moves.push(...this.getCastleMoves(selectedPiece.color, game));
    }

    const boardClone = board.clone();

    moves = moves.filter(move =>
      this.isMoveLegal(move, selectedPiece.color, boardClone)
    );

    return moves;
  }

  private isMoveLegal(
      move: Move,
      color: Color,
      board: Board
  ): boolean {

      this.applyMoveOnBoard(move, board);

      const checks = this.getActiveChecks(
          board,
          PLAYER_COLORS
      );

      return ![...checks.values()].some(colors => colors.includes(color));
  }

  private withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[] {
    const board = game.getBoard();
    const promotionMove = this.promotion(pawn, from);
    const doubleStepMove = this.getPawnDoubleStep(pawn, from, board);
    const enPassantMove = this.getEnPassantMove(pawn, from, game);

    if (promotionMove) {
      moves = moves.map(move => promotionMove.to === move.to ? promotionMove : move);
    }

    if (doubleStepMove) moves.push(doubleStepMove);
    if (enPassantMove) moves.push(enPassantMove);

    return moves;
  }

  private getActiveChecks(
    board: Board,
    players: Iterable<Color>
  ): Map<string, Color[]> {
    const enemyKings = new Map<Color, number>();
    const checkInfos = new Map<string, Color[]>();

    for (const color of PLAYER_COLORS) {
      const kingPos = board.getPositionOf(`K-${color}`);
      if (kingPos !== undefined) {
        enemyKings.set(color, kingPos);
      }
    }

    for (const player of players) {
      for (const piece of board.getPiecesByColor(player)) {
        const moves = new Set(
          this.moveGenerator.generateMovesForPiece(piece, board)
        );

        for (const [kingColor, kingPos] of enemyKings) {
          if (kingColor === player) continue;
          if (!moves.has(kingPos)) continue;

          const checkedColors = checkInfos.get(piece.id) ?? [];
          checkedColors.push(kingColor);
          checkInfos.set(piece.id, checkedColors);
        }
      }
    }

    return checkInfos;
  }

  private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
    const forward = forwardDirection(pawn.color);

    if (!this.canDoubleSteps(pawn, from)) return undefined;

    const oneStepSquare = from + forward.rowDelta + 14 * forward.colDelta;
    const doubleStepSquare = oneStepSquare + forward.rowDelta + 14 * forward.colDelta;

    if (
      board.isValidSquare(oneStepSquare) &&
      !board.isOccupied(oneStepSquare) &&
      board.isValidSquare(doubleStepSquare) &&
      !board.isOccupied(doubleStepSquare)
    ) {
      return this.moveGenerator.buildMove(
        pawn.id,
        from,
        doubleStepSquare,
        undefined,
        "doublestep"
      );
    }

    return undefined;
  }

  public getCastleMoves(player: Color, game: Game): Move[] {
    if (game.getGameState().getPlayerState(player) === PlayerState.CHECK) {
      return [];
    }

    const castle: Move[] = [];
    const board = game.getBoard();
    const hasKingMoved = game.hasPieceMoved(`K-${player}`);
    const from = board.getPositionOf(`K-${player}`)!;

    for (const kingSide of [true, false]) {
      const side = kingSide ? "kingside" : "queenside";
      const hasRookMoved = game.hasPieceMoved(`R-${player}-${side}`);
      const rookPos = board.getPositionOf(`R-${player}-${side}`)!;

      if (
        from === kingInitialSquareId(player) &&
        !hasKingMoved &&
        rookPos === rookInitialSquareId(player, kingSide) &&
        !hasRookMoved
      ) {
        const allOpponentsMoves = this.moveGenerator.generateAllOpponentsMoves(board, player);
        const direction = castleDirectionOffset(player, kingSide);
        const oneStep = from + direction;
        const doubleStep = oneStep + direction;

        if (
          !board.isOccupied(oneStep) &&
          !allOpponentsMoves.has(oneStep) &&
          !board.isOccupied(doubleStep) &&
          !allOpponentsMoves.has(doubleStep)
        ) {
          castle.push(this.moveGenerator.buildMove(
            `K-${player}`,
            from,
            doubleStep,
            side
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
    const gameHistory = game.getHistory();
    if (gameHistory.length === 0) return undefined;

    const lastMove = gameHistory[gameHistory.length - 1];
    if (lastMove?.pawnSpecialMove !== "doublestep") return undefined;
    if (!EN_PASSANT_SQUARES_IDS.has(from)) return undefined;

    const enPassant = this.getEnPassantDestination(pawn, from, lastMove);
    if (enPassant === undefined) return undefined;

    return this.moveGenerator.buildMove(pawn.id, from, enPassant, undefined, "e-p");
  }

  private getEnPassantDestination(
    pawn: Piece,
    from: number,
    lastMove: Move
  ): number | undefined {
    if (pawn.color === Color.RED || pawn.color === Color.YELLOW) {
      if (lastMove.to !== from - 14 && lastMove.to !== from + 14) {
        return undefined;
      }

      return pawn.color === Color.RED ? lastMove.to + 1 : lastMove.to - 1;
    }

    if (lastMove.to !== from - 1 && lastMove.to !== from + 1) {
      return undefined;
    }

    return pawn.color === Color.BLUE ? lastMove.to + 14 : lastMove.to - 14;
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
    if (!this.canPromote(pawn, from)) return undefined;

    const forward = forwardDirection(pawn.color);

    return this.moveGenerator.buildMove(
      pawn.id,
      from,
      from + forward.rowDelta + 14 * forward.colDelta,
      undefined,
      "promotion"
    );
  }

  public getCheckInfos(player: Color, game: Game): Map<string, Color[]> {
    return this.getActiveChecks(game.getBoard(), [player]);
  }

  public updateGameState(game: Game): GameState {
    const state = game.getGameState();
    if (state.getStatus() !== GameStatus.RUNNING) return state;
    
    const currentPlayerColor = game.getCurrentPlayerColor();

    // Reset all active CHECK states before recomputing them.
    for (const color of PLAYER_COLORS) {
      if (state.getPlayerState(color) === PlayerState.CHECK) {
        state.setPlayerState(color, PlayerState.NORMAL);
      }
    }

    // Recompute all active checks from the current board position.
    const activeChecks = this.getActiveChecks(
      game.getBoard(),
      PLAYER_COLORS
    );

    const checkedColors: Color[] = Array.from(activeChecks.values()).flat();

    for (const color of new Set(checkedColors)) {
      state.setPlayerState(color, PlayerState.CHECK);
    }

    if (
      state.getPlayerState(currentPlayerColor) === PlayerState.CHECK &&
      this.isPlayerMate(currentPlayerColor, game)
    ) {
      state.setPlayerState(currentPlayerColor, PlayerState.CHECKMATE);
    }

    if (
      state.getPlayerState(currentPlayerColor) === PlayerState.NORMAL &&
      this.isPlayerMate(currentPlayerColor, game)
    ) {
      state.setPlayerState(currentPlayerColor, PlayerState.STALEMATE);
    }

    return state;
  }

  public isPlayerMate(player: Color, game: Game): boolean {
    const board = game.getBoard();
    const pieces = board.getPiecesByColor(player);

    for (const piece of pieces) {
      if (this.getLegalMoves(piece.id, game).length > 0) {
        return false;
      }
    }

    return true;
  }
}
