import { Board } from "../board";
import { Game, getMutableBoard, getMutableGameInternals } from "../game";
import { Move, MoveGenerator } from "../moves";
import { castleDirectionOffset } from "../moves/king-moves";
import { stepInDirection } from "../moves/move-geometry";
import { forwardDirection, pawnMoves } from "../moves/pawn-moves";
import { Color, GameStatus, Piece, PieceType } from "../types";
import { kingInitialSquareId, rookInitialSquareId } from "../utils/utils";
import { RuleSet } from "./rule-set";

export class DefaultRuleSet extends RuleSet {
  private awardedMateStates = new Set<string>();
  private awardedMoveHistoryLength = 0;
  private processedHistoryLength = 0;

  constructor(
    moveGenerator: MoveGenerator
  ) { super(moveGenerator); }

  private awardPoints(_game: Game, isDraw: boolean): void {
    if (_game.getHistory().length > this.awardedMoveHistoryLength) {
      this.awardCapturePoints(_game);
      this.awardMultiCheckPoints(_game);
      this.awardedMoveHistoryLength = _game.getHistory().length;
    }

    this.awardMatePoints(_game);

    if (isDraw) {
      this.getActivePlayers(_game).forEach(player =>
        this.awardPlayerPoints(player, 10, _game)
      );
    }
  }

  protected awardCapturePoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];
    const capturedPieceId = lastMove.capture;

    if (capturedPieceId === undefined) return;

    const capturedPiece = _game.getCapturedPiece(capturedPieceId)!;
    if (!capturedPiece.wasActive) return;

    if (!_game.isPlayerActive(capturedPiece.capturedBy)) return;

    const awardedPoints = capturedPiece.points ? capturedPiece.points : 0;

    this.awardPlayerPoints(capturedPiece.capturedBy, awardedPoints, _game);
  }

  protected awardMultiCheckPoints(_game: Game): void {
    const history = _game.getHistory();
    const lastMove = history[history.length - 1];

    const checkedKings = lastMove.check;

    if (!checkedKings || checkedKings.length < 2) return;

    const movedPiece = _game.getBoard().getPiece(lastMove.pieceId)!;

    switch(movedPiece.type) {
      case PieceType.QUEEN:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.length === 2? 1: 5,
          _game
        );
        return;
      default:
        this.awardPlayerPoints(
          movedPiece.color,
          checkedKings.length === 2? 5: 20,
          _game
        );
        return;
    }
  }

  protected awardMatePoints(game: Game): void {
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (
        game.isPlayerCheckMated(color) &&
        this.markMateAwardPending(color, 'checkmate')
      ) {
        this.awardCheckmatePoints(color, game);
      }
      if (
        game.isPlayerStalled(color) &&
        this.markMateAwardPending(color, 'stalemate')
      ) {
        if (!game.isPlayerResignedOrTimedOut(color))
          this.awardPlayerPoints(color, 20, game);

        this.awardStalematePoints(color, game);
      }
    }
  }

  private markMateAwardPending(color: Color, kind: 'checkmate' | 'stalemate'): boolean {
    const key = `${color}-${kind}`;

    if (this.awardedMateStates.has(key)) return false;

    this.awardedMateStates.add(key);
    return true;
  }

  private awardCheckmatePoints(
      checkedColor: Color,
      game: Game
  ): void {
      const architect = this.findCheckmateArchitect(checkedColor, game);

      if (architect === undefined) return;

      this.awardPlayerPoints(architect, 20, game);
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
    this.endGameForDrawStatus(game, this.isDraw(game));
  }

  private endGameForDrawStatus(game: Game, isDraw: boolean): void {
    if (game.isOver()) return;

    if (this.endGameIfSoleSurvivor(game, false)) return;

    if (!isDraw) return;

    getMutableGameInternals(game).setGameStatus(GameStatus.OVER);
  }

  protected isKingInCheck(board: Board, kingColor: Color): boolean {
    const kingPos = board.getKingSquare(kingColor);
    if (kingPos === undefined) return false;
    const king = board.getPieceAt(kingPos)!;
    if (!board.isPieceActive(king.id)) return false;

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if (color === kingColor) continue;

      for (const piece of board.getPiecesByColor(color)) {
        if (this.moveGenerator.generateMovesForPiece(piece, board).includes(kingPos)) {
          return true;
        }
      }
    }

    return false;
  }

  protected withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[] {
    // CHANGED: game.getBoard() as Board → getMutableBoard(game)
    const board = getMutableBoard(game);
    const promotionMoves = this.getPromotionMoves(pawn, from, board);
    const doubleStepMove = this.getPawnDoubleStep(pawn, from, board);

    if (promotionMoves.length > 0) {
      const promotionByDestination = new Map(
        promotionMoves.map(move => [move.to, move])
      );
      moves = moves.map(move => promotionByDestination.get(move.to) ?? move);
    }

    if (doubleStepMove) moves.push(doubleStepMove);

    return moves;
  }

  private getPawnDoubleStep(pawn: Piece, from: number, board: Board): Move | undefined {
    if (!this.canDoubleSteps(pawn, from)) return undefined;

    const forward = forwardDirection(pawn.color);
    const oneStepSquare = stepInDirection(from, forward);
    const doubleStepSquare = stepInDirection(from, forward, 2);

    if (oneStepSquare === undefined || doubleStepSquare === undefined) return undefined;

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
    if (game.isPlayerInCheck(player) || game.isPlayerResignedOrTimedOut(player)) {
      return [];
    }

    const castle: Move[] = [];
    const board = game.getBoard() as Board;
    const from = board.getKingSquare(player);
    if (!from) return [];

    const king = board.getPieceAt(from)!;
    const hasKingMoved = game.hasPieceMoved(king.id);
    

    for (const kingSide of [true, false]) {
      const side = kingSide ? "kingside" : "queenside";
      const hasRookMoved = game.hasPieceMoved(`R-${player}-${side}`);
      const rookPos = board.getSquareOf(`R-${player}-${side}`)!;

      if (
        from === kingInitialSquareId(player) &&
        !hasKingMoved &&
        rookPos === rookInitialSquareId(player, kingSide) &&
        !hasRookMoved
      ) {
        const allOpponentsMoves = this.moveGenerator.
          generateAllOpponentsMoves(
            board,
            DefaultRuleSet.PLAYER_COLORS.filter(
              c => player !== c
            )
          );
        const direction = castleDirectionOffset(player, kingSide);
        const oneStep = from + direction;
        const doubleStep = oneStep + direction;
        const thirdStep = doubleStep + direction;

        const pathIsClear =
          !board.isOccupied(oneStep) &&
          !board.isOccupied(doubleStep) &&
          (
            kingSide ||
            !board.isOccupied(thirdStep)
          );

        const kingPathIsSafe =
          !allOpponentsMoves.has(oneStep) &&
          !allOpponentsMoves.has(doubleStep);

        if (pathIsClear && kingPathIsSafe) {
          castle.push(this.moveGenerator.buildMove(
            king.id,
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

  public getPromotionMoves(pawn: Piece, from: number, board: Board): Move[] {
    if (!this.canPromote(pawn, from)) return [];

    return pawnMoves(pawn, from, board).map(to =>
      this.moveGenerator.buildMove(pawn.id, from, to, undefined, "promotion")
    );
  }

  public updateGameState(game: Game): void {
    if (game.isOver()) return;

    const history = game.getHistory();
    if (history.length > this.processedHistoryLength) {
      const lastMove = history[history.length - 1];
      const piecePlayed = game.getBoard().getPiece(lastMove.pieceId)!;

      // CHANGED: game.incrementMoveClock()/resetMoveClock() → internals
      const internals = getMutableGameInternals(game);
      if (!lastMove.capture && piecePlayed.type !== PieceType.PAWN) {
        internals.incrementMoveClock();
      } else {
        internals.resetMoveClock();
      }

      this.processedHistoryLength = history.length;
    }

    const currentPlayerColor = game.getCurrentPlayerColor();
    if (
      game.isPlayerCheckMated(currentPlayerColor) ||
      game.isPlayerStalled(currentPlayerColor)
    ) {
      return;
    }

    if (game.getBoard().getSquareOf(`K-${currentPlayerColor}`) === undefined) {
      return;
    }

    // CHANGED: game.getBoard() as Board → getMutableBoard(game)
    const checkedColors = this.getCheckedKings(getMutableBoard(game));

    // CHANGED: game.setPlayerInCheck → internals
    const internals = getMutableGameInternals(game);
    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      internals.setPlayerInCheck(color, checkedColors.has(color));
    }

    if (!this.isPlayerMate(currentPlayerColor, game)) return;

    if (checkedColors.has(currentPlayerColor)) {
      internals.setPlayerCheckmated(currentPlayerColor);
    } else {
      internals.setPlayerStalemated(currentPlayerColor);
    }
  }

  protected applyRulesPostMove(game: Game): void {
    this.updateGameState(game);

    const isDraw = this.isDraw(game);

    this.awardPoints(game, isDraw);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      this.updatePlayerPiecesStatus(color, game);
    }

    this.endGameForDrawStatus(game, isDraw);
  }

  private updatePlayerPiecesStatus(color: Color, game: Game): void {
    if (!game.isPlayerActive(color)) {

        if (game.isPlayerResignedOrTimedOut(color)) {

            if (game.isPlayerStalled(color) || game.isPlayerCheckMated(color))
                // CHANGED: game.setPlayerInactive(color) → direct board call
                getMutableBoard(game).setPlayerPiecesInactive(color);
            else
                getMutableBoard(game).setPlayerPiecesInactive(color, true);

        } else {
            getMutableBoard(game).setPlayerPiecesInactive(color);
        }
    }
  }

  public isDrawByInsufficientMaterial(game: Game): boolean {
    const remainingPieces = new Map<Color, Piece[]>([
      [Color.RED, []], [Color.BLUE, []],
      [Color.YELLOW, []], [Color.GREEN, []]
    ]);

    const remainingKingsMovesLength = new Map<Color, number>([
      [Color.RED, 0], [Color.BLUE, 0],
      [Color.YELLOW, 0], [Color.GREEN, 0]
    ]);

    for (const color of DefaultRuleSet.PLAYER_COLORS) {
      if(!game.isPlayerActive(color) &&
         !game.isPlayerResignedOrTimedOut(color)
        ) {
          continue;
        }

      const pieces = game.getBoard().getPiecesByColor(color);

      for (const piece of pieces) {
        if (
          piece.type !== PieceType.BISHOP &&
          piece.type !== PieceType.KNIGHT &&
          piece.type !== PieceType.KING
        ) {
          return false;
        }

        const playerPieces = remainingPieces.get(color)!;
        if (game.getBoard().isPieceActive(piece.id)) {
          playerPieces.push(piece);
        }
        remainingPieces.set(color, playerPieces);

        if (piece.type === PieceType.KING) {
          // CHANGED: game.getBoard() as Board → getMutableBoard(game)
          const kingMoves = this.moveGenerator.generateMovesForPiece(
            piece,
            getMutableBoard(game)
          );

          remainingKingsMovesLength.set(color, kingMoves.length);
        }
      }

      const remainingPieceTypes = remainingPieces
        .get(color)!
        .map(piece => piece.type);

      if (remainingPieceTypes.length > 3)
        return false;

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

    if (!hasDoubleKnight)
      return true;

    const kingMoveCounts = Array.from(remainingKingsMovesLength.values());

    return kingMoveCounts.every(moveCount => moveCount < 2);
  }

  public isDrawBy50MovesRule(game: Game): boolean {
    return game.getMoveClock() >= 200;
  }
}