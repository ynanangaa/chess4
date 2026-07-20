import { Board } from "../board";
import { Game } from "../game";
import { 
  castleDirectionOffset, 
  enPassantCapturedPawnSquare, 
  forwardDirection, 
  Move, 
  MoveGenerator,
  rookCastleDirectionOffset, 
} from "../moves";
import { CapturedPiece, Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
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
    const [appliedMove, capturedPiece]: 
      [Move | undefined, CapturedPiece | undefined]
        = this.applyMoveOnBoard(move, game.getBoard());
    if (!appliedMove) return false;

    // Stage 2 : Game (history, moved and captured pieces, check infos)
    if (capturedPiece) {
      game.addCapturedPiece(capturedPiece.id, capturedPiece)
    }
    const movedPiece = game.getBoard().getPiece(appliedMove.pieceId)!;

    game.addMovedPiece(appliedMove.pieceId);
    if (move.castle) {
        const color = movedPiece.color;
        game.addMovedPiece(`R-${color}-${move.castle}`);
    }
    this.recordMove(appliedMove, movedPiece.color, game);

    // Stage 3 : Rules (Game state update, points awarded, pieces statuses)
    this.updateGameState(game);
    this.awardPoints(game);

    for (const color of PLAYER_COLORS) {
      this.updatePlayerPiecesStatus(color, game);
    }

    this.endGame(game);

    return true;
  }

  private applyMoveOnBoard(
    move: Move, 
    board: Board
  ): [Move | undefined, CapturedPiece | undefined] {
    let appliedMove = this.withDirectCapture(move, board);

    let directCapturedId = appliedMove.capture;
    let enPassantCapturedId: string | undefined = undefined;

    [appliedMove, enPassantCapturedId] = 
      this.applyEnPassant(appliedMove, board);

    this.applyPromotion(appliedMove, board);
    this.applyCastling(move, board);

    /* Piece captured is either from en-passant 
    /* or direct capture but never both */
    const capturedPieceId = directCapturedId ?? enPassantCapturedId;

    const capturedPiece =
      capturedPieceId !== undefined
        ? board.getPiece(capturedPieceId)!
        : undefined;

    const movedPiece = board.placePiece(move.pieceId, move.to);

    if (!movedPiece) return [undefined, undefined];

    if(!capturedPiece) return [appliedMove, capturedPiece];

    if (enPassantCapturedId !== undefined)
      board.removePiece(enPassantCapturedId);

    return [
      appliedMove, {
        ...capturedPiece!, 
        capturedBy: movedPiece.color
      }
    ];
  }

  private withDirectCapture(move: Move, board: Board): Move {
    const capturedPiece = board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  private applyEnPassant(
    move: Move, 
    board: Board)
    : [Move, string | undefined] {
    const capturedPieceId = this.getCapturedPieceIdForEnPassant(move, board);
    if (!capturedPieceId) return [move, undefined];

    return [{ ...move, capture: capturedPieceId }, capturedPieceId];
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

  private awardPoints(_game: Game): void {
    this.awardCapturePoints(_game);
    this.awardMultiCheckPoints(_game);
    this.awardMatePoints(_game);
  }

  public awardCapturePoints (_game: Game): void {

    const history = _game.getHistory();
    const lastMove = history[history.length - 1];
    const capturedPieceId = lastMove.capture;

    if (capturedPieceId === undefined) return;

    const capturedPiece = _game.getCapturedPiece(capturedPieceId)!;
    if(!capturedPiece.active) return;

    if(!_game.isPlayerActive(capturedPiece.capturedBy)) return;

    const awardedPoints = capturedPiece.points? capturedPiece.points: 0;

    this.awardPlayerPoints(
      capturedPiece.capturedBy,
      awardedPoints,
      _game
    ); 

  }

  public awardMultiCheckPoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];

    const checkInfos = lastMove.check;

    if (checkInfos === undefined) return;

    const checkedKings: Set<Color> = new Set(
      Array.from(checkInfos.values()).flat()
    )

    if (checkedKings.size < 2) return;

    const movedPiece = _game.getBoard().getPiece(lastMove.pieceId)!;

    switch(movedPiece.type) {
      case PieceType.QUEEN:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.size === 2? 1: 5,
          _game
        );
        return;
      default:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.size === 2? 5: 20,
          _game
        );
        return;
    }
  }

  public awardMatePoints(game: Game): void {
      for (const color of PLAYER_COLORS) {
        if(game.isPlayerCheckMated(color)) {
          this.awardCheckmatePoints(color, game);
        }
        if(this.isPlayerStalled(color, game)) {

          if(!game.isPlayerResignedOrTimedOut(color))
            this.awardPlayerPoints(color, 20, game);

          this.awardStalematePoints(color, game);
        }
      }
  }

  private awardCheckmatePoints(
      checkedColor: Color,
      game: Game
  ): void {
      const checks = this.getActiveChecks(
          game.getBoard(),
          PLAYER_COLORS
      );

      const attackers = this.getCheckingPlayers(
          checks,
          checkedColor,
          game.getBoard()
      );

      if (attackers.length === 0) {
          return;
      }

      let current = game.getNextPlayerColor(checkedColor)!;

      while (current !== checkedColor) {
          if (attackers.includes(current)) {
              this.awardPlayerPoints(current, 20, game);
              return;
          }

          current = game.getNextPlayerColor(current)!;
      }
  }

  private awardStalematePoints(
      stalledColor: Color,
      game: Game
  ): void {
      for (const color of PLAYER_COLORS) {
          if (color === stalledColor) {
              continue;
          }

          if (game.isPlayerActive(color)) {
              this.awardPlayerPoints(color, 10, game);
          }
      }
  }

  private endGame(game: Game): void {
    const activePlayers = PLAYER_COLORS.filter(color =>
      game.isPlayerActive(color)
    );

    if (activePlayers.length !== 1) {
      return;
    }

    game.setGameStatus(GameStatus.OVER);
  }

  private getCheckingPlayers(
      checks: Map<string, Color[]>,
      checkedColor: Color,
      board: Board
  ): Color[] {
      const attackers: Color[] = [];

      for (const [pieceId, checkedColors] of checks) {
          if (!checkedColors.includes(checkedColor)) {
              continue;
          }

          const attacker = board.getPiece(pieceId)!.color;

          if (!attackers.includes(attacker)) {
              attackers.push(attacker);
          }
      }

      return attackers;
  }

  private awardPlayerPoints(
      color: Color,
      points: number,
      game: Game
  ): void {
      game.incrementPlayerScore(color, points);
  }

  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = game.getBoard();
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return [];

    const from = board.getPositionOf(pieceId)!;
    const playerState = game.getPlayerState(selectedPiece.color);

    if (
      playerState === PlayerState.CHECKMATE ||
      playerState === PlayerState.STALEMATE
    ) {
      return [];
    }

    const pseudoLegalMoves = this.moveGenerator.generateMovesForPiece(selectedPiece, board);
    if (pseudoLegalMoves.length === 0) return [];

    let moves = pseudoLegalMoves.map(to =>
      this.moveGenerator.buildMove(pieceId, from, to)
    );

    if (selectedPiece.type === PieceType.PAWN) {
      moves = this.withPawnSpecialMoves(selectedPiece, from, game, moves);
    }

    if (selectedPiece.type === PieceType.KING) {
      moves.push(...this.getCastleMoves(selectedPiece.color, game));
    }

    moves = moves.filter(move =>
      this.isMoveLegal(move, selectedPiece.color, board)
    );

    return moves;
  }

  private isMoveLegal(
      move: Move,
      color: Color,
      board: Board
  ): boolean {
    // Each candidate move must be tried on its own fresh clone of the
    // original position. Reusing a single mutated clone across multiple
    // candidate moves (as this used to do) leaks the side effects of one
    // candidate (captures, piece removals, etc.) into the legality check
    // of the next candidate, producing false positives/negatives.
    const boardClone = board.clone();

    this.applyMoveOnBoard(move, boardClone);

    const checks = this.getActiveChecks(
        boardClone,
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
        if (board.getPieceAt(kingPos)!.active)
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
    if (game.getPlayerState(player) === PlayerState.CHECK ||
        game.isPlayerResignedOrTimedOut(player)
    ) {
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

  updateGameState(game: Game): void {
    const state = game.getGameState();
    if (state.getStatus() !== GameStatus.RUNNING) return;
    
    const currentPlayerColor = game.getCurrentPlayerColor();

    // Reset all active CHECK states before recomputing them.
    for (const color of PLAYER_COLORS) {
      if (game.getPlayerState(color) === PlayerState.CHECK) {
        game.setPlayerState(color, PlayerState.NORMAL);
      }
    }

    // Recompute all active checks from the current board position.
    const activeChecks = this.getActiveChecks(
      game.getBoard(),
      PLAYER_COLORS
    );

    const checkedColors: Color[] = Array.from(activeChecks.values()).flat();

    for (const color of new Set(checkedColors)) {
      game.setPlayerState(color, PlayerState.CHECK);
    }

    if (
      game.getPlayerState(currentPlayerColor) === PlayerState.CHECK &&
      this.isPlayerMate(currentPlayerColor, game)
    ) {
      game.setPlayerState(currentPlayerColor, PlayerState.CHECKMATE);
    }

    if (
      game.getPlayerState(currentPlayerColor) === PlayerState.NORMAL &&
      this.isPlayerMate(currentPlayerColor, game)
    ) {
      game.setPlayerState(currentPlayerColor, PlayerState.STALEMATE);
    }

    return;
  }

  private updatePlayerPiecesStatus(color: Color, game: Game): void {
    if (!game.isPlayerActive(color)) {

        if (game.isPlayerResignedOrTimedOut(color)) {

            if (this.isPlayerStalled(color, game))
                game.setPlayerInactive(color);
            else
                game.setPlayerInactive(color, true);

        } else {
            game.setPlayerInactive(color);
        }
    }
  }
}
