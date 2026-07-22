import { Board } from "../board";
import { Game } from "../game";
import { 
  castleDirectionOffset, 
  forwardDirection, 
  Move, 
  MoveGenerator,
} from "../moves";
import { Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { kingInitialSquareId, pickRandomElement, rookInitialSquareId } from "../utils";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { RuleSet } from "./rule-set";

export class DefaultRuleSet extends RuleSet {
  private awardedMateStates = new Set<string>();
  private awardedMoveHistoryLength = 0;
  private processedHistoryLength = 0;

  constructor(
    moveGenerator: MoveGenerator
  ) { super(moveGenerator); }

  private awardPoints(_game: Game): void {
    if (_game.getHistory().length > this.awardedMoveHistoryLength) {
      this.awardCapturePoints(_game);
      this.awardMultiCheckPoints(_game);
      this.awardedMoveHistoryLength = _game.getHistory().length;
    }

    this.awardMatePoints(_game);
  }

  private awardPlayerPoints(
      color: Color,
      points: number,
      game: Game
  ): void {
      game.incrementPlayerScore(color, points);
  }

  protected awardCapturePoints (_game: Game): void {

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

  protected awardMultiCheckPoints(_game: Game): void {
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

  protected awardMatePoints(game: Game): void {
      for (const color of DefaultRuleSet.PLAYER_COLORS) {
        if (
          game.isPlayerCheckMated(color) &&
          this.markMateAwardPending(color, PlayerState.CHECKMATE)
        ) {
          this.awardCheckmatePoints(color, game);
        }
        if (
          game.isPlayerStalled(color) &&
          this.markMateAwardPending(color, PlayerState.STALEMATE)
        ) {

          if(!game.isPlayerResignedOrTimedOut(color))
            this.awardPlayerPoints(color, 20, game);

          this.awardStalematePoints(color, game);
        }
      }
  }

  private markMateAwardPending(color: Color, state: PlayerState): boolean {
    const key = `${color}-${state}`;

    if (this.awardedMateStates.has(key)) return false;

    this.awardedMateStates.add(key);
    return true;
  }

  private awardCheckmatePoints(
      checkedColor: Color,
      game: Game
  ): void {
      const checks = this.getActiveChecks(
          game.getBoard(),
          DefaultRuleSet.PLAYER_COLORS
      );

      const attackers = this.getCheckingPlayers(
          checks,
          checkedColor,
          game.getBoard()
      );

      if (attackers.length === 0) {
          return;
      }

      let current = game.getNextActivePlayerColor(checkedColor)!;

      while (current !== checkedColor) {
          if (attackers.includes(current)) {
              this.awardPlayerPoints(current, 20, game);
              return;
          }

          current = game.getNextActivePlayerColor(current)!;
      }
  }

  private awardStalematePoints(
      stalledColor: Color,
      game: Game
  ): void {
      for (const color of DefaultRuleSet.PLAYER_COLORS) {
          if (color === stalledColor) {
              continue;
          }

          if (game.isPlayerActive(color)) {
              this.awardPlayerPoints(color, 10, game);
          }
      }
  }

  public endGame(game: Game): void {
    const activePlayers = this.getActivePlayers(game);

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

  protected getActiveChecks(
    board: Board,
    players: Iterable<Color>
  ): Map<string, Color[]> {
    const enemyKings = new Map<Color, number>();
    const checkInfos = new Map<string, Color[]>();

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
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

  protected withPawnSpecialMoves(
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

  protected canDoubleSteps(pawn: Piece, from: number): boolean {
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

  public updateGameState(game: Game): void {
    if (game.isOver()) return;
    
    const history = game.getHistory();
    if (history.length > this.processedHistoryLength) {
      const lastMove = history[history.length - 1];
      const piecePlayed = game.getBoard().getPiece(lastMove.pieceId)!;

      if (!lastMove.capture && piecePlayed.type !== PieceType.PAWN) {
        game.incrementMoveClock();
      } else {
        game.resetMoveClock();
      }

      this.processedHistoryLength = history.length;
    }
    
    const currentPlayerColor = game.getCurrentPlayerColor();
    if (
      game.hasPlayerState(currentPlayerColor, PlayerState.CHECKMATE) ||
      game.hasPlayerState(currentPlayerColor, PlayerState.STALEMATE)
    ) {
      return;
    }

    // Reset all active CHECK states before recomputing them.
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (game.hasPlayerState(color, PlayerState.CHECK)) {
        game.setPlayerState(color, PlayerState.NORMAL);
      }
    }

    // Recompute all active checks from the current board position.
    const activeChecks = this.getActiveChecks(
      game.getBoard(),
      DefaultRuleSet.PLAYER_COLORS
    );

    const checkedColors: Color[] = Array.from(activeChecks.values()).flat();

    for (const color of new Set(checkedColors)) {
      game.setPlayerState(color, PlayerState.CHECK);
    }

    if (!this.isPlayerMate(currentPlayerColor, game)) return;

    if (checkedColors.includes(currentPlayerColor)) {
      game.setPlayerState(currentPlayerColor, PlayerState.CHECKMATE);
    } else {
      game.setPlayerState(currentPlayerColor, PlayerState.STALEMATE);
    }
  }

  protected applyRulesPostMove(game: Game): void {
    this.updateGameState(game);
    this.awardPoints(game);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      this.updatePlayerPiecesStatus(color, game);
    }

    this.endGame(game);
  }

  private updatePlayerPiecesStatus(color: Color, game: Game): void {
    if (!game.isPlayerActive(color)) {

        if (game.isPlayerResignedOrTimedOut(color)) {

            if (game.isPlayerStalled(color))
                game.setPlayerInactive(color);
            else
                game.setPlayerInactive(color, true);

        } else {
            game.setPlayerInactive(color);
        }
    }
  }

  public isInsufficientMaterial(game: Game): boolean {
    const remainingPieces = new Map<Color, Piece[]>([
      [Color.RED, []], [Color.BLUE, []],
      [Color.YELLOW, []], [Color.GREEN, []]
    ]);

    const remainingKingsMovesLength = new Map<Color, number>([
      [Color.RED, 0], [Color.BLUE, 0],
      [Color.YELLOW, 0], [Color.GREEN, 0]
    ]);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      // Ignore players that are already out of the game.
      // Resigned or timed-out kings are still considered because they
      // remain active until they are eventually checkmated or stalemated.
      if(!game.isPlayerActive(color) && 
         !game.isPlayerResignedOrTimedOut(color)
        ) {
          continue;
        }

      const pieces = game.getBoard().getPiecesByColor(color);

      for (const piece of pieces) {
        // Any remaining pawn, rook or queen is sufficient mating material.
        if (
          piece.type !== PieceType.BISHOP &&
          piece.type !== PieceType.KNIGHT &&
          piece.type !== PieceType.KING
        ) {
          return false;
        }

        const playerPieces = remainingPieces.get(color)!;
        if(piece.active) {
          // Still necessary condition because
          // of resigned or timed-out players
          playerPieces.push(piece);
        }
        remainingPieces.set(color, playerPieces);

        // Store the king mobility.
        // It is only needed for the king + two knights endgame,
        // where checkmate remains theoretically possible if the defending
        // king still has enough freedom to cooperate unintentionally.
        if (piece.type === PieceType.KING) {
          const kingMoves = this.moveGenerator.generateMovesForPiece(
            piece,
            game.getBoard()
          );

          remainingKingsMovesLength.set(color, kingMoves.length);
        }
      }

      const remainingPieceTypes = remainingPieces
        .get(color)!
        .map(piece => piece.type);

      // More than king + two minor pieces is always sufficient material.
      if (remainingPieceTypes.length > 3)
        return false;

      // Any combination containing a bishop (K+B+B or K+B+N)
      // is sufficient mating material.
      if (
        remainingPieceTypes.length === 3 &&
        remainingPieceTypes.includes(PieceType.BISHOP)
      ) {
        return false;
      }
    }

    let hasDoubleKnight = false;

    for (const pieces of remainingPieces.values()) {
      if (pieces.length === 3) {
        hasDoubleKnight = true;
        break;
      }
    }

    // Only kings, kings + bishops and kings + single knights remain.
    // None of these positions can lead to a forced checkmate.
    if (!hasDoubleKnight)
      return true;

    // At least one player still has king + two knights.
    // Checkmate remains theoretically possible only if a defending king
    // still has enough legal moves to cooperate unintentionally.
    const kingMoveCounts = Array.from(remainingKingsMovesLength.values());

    return kingMoveCounts.some(moveCount => moveCount >= 2);
  }

  public isGameDrawBy50MovesRule(game: Game): boolean {
    return game.getMoveClock() >= 200;
  }
}
