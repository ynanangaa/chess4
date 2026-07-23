import { Board } from "../board";
import { Game } from "../game";
import { enPassantCapturedPawnSquare, Move, MoveGenerator, rookCastleDirectionOffset } from "../moves";
import { CapturedPiece, Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { pickRandomElement } from "../utils";

export abstract class RuleSet {

  protected static PLAYER_COLORS = [
    Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN
  ];

  constructor(
    protected readonly moveGenerator: MoveGenerator
  ) {}

  public applyMove(move: Move, game: Game): boolean {
    if (game.isOver()) return false;
    
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

    return true;
  }

  public advanceTurn(game: Game, move?: Move): boolean {
    if (game.isOver()) return false;

    const currentPlayer = game.getCurrentPlayerColor();

    if (game.isPlayerActive(currentPlayer)) {
      if (!move) return false;

      const movedPiece = game.getBoard().getPiece(move.pieceId);
      if (!movedPiece || movedPiece.color !== currentPlayer) return false;
      game.incrementPositionCount(
        this.computePositionKey(game)
      );
      if (!this.applyMove(move, game)) return false;

      game.advanceCurrentPlayer();
      this.applyRulesPostMove(game);

      return true;
    } else if (game.isPlayerResignedOrTimedOut(currentPlayer)) {
      if (this.isPlayerMate(currentPlayer, game)) {
        game.incrementMoveClock();
      } else {
        const kingMove = this.chooseRandomKingMove(currentPlayer, game);

        if (kingMove) {
          this.applyMove(kingMove, game);
        } else {
          game.incrementMoveClock();
        }
      }
    } else {
      game.incrementMoveClock();
    }

    this.applyRulesPostMove(game);
    game.advanceCurrentPlayer();

    return true;
  }
  
  protected applyMoveOnBoard(
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

  private chooseRandomKingMove(color: Color, game: Game): Move | undefined {
    const kingMoves = this.getLegalMoves(`K-${color}`, game);
    if (kingMoves.length === 0) return undefined;

    return pickRandomElement(kingMoves);
  }

  protected isDraw(game: Game): boolean {
    return (this.isDrawByTripleRepetition(game) || 
      this.isDrawBy50MovesRule(game) ||
      this.isDrawByInsufficientMaterial(game)
    )
  }

  public computePositionKey(game: Game): string {
    const board = game.getBoard();
    const currentPlayer = game.getCurrentPlayerColor();

    const castlingRights = this.getCastleMoves(
      currentPlayer, 
      game
    ).map(c => c.castle!);
    const enPassantTargets: string[] = [];

    for (const piece of board.getPiecesByColor(currentPlayer)) {
      if (piece.type === PieceType.PAWN) {
        const from = board.getPositionOf(piece.id)!;
        const moves = this.getEnPassantMoves(piece, from, game);

        if (!moves) continue;

        for (const move of moves) {
          enPassantTargets.push(
            move.pieceId + ',' + move.to.toString()
          );
        }
      }
    }

    castlingRights.sort();
    enPassantTargets.sort((a, b) => Number(a) - Number(b));

    return [
      board.toString(),
      currentPlayer,
      `castling=${castlingRights.length > 0
        ? castlingRights.join(";")
        : "none"}`,
      `ep=${enPassantTargets.length > 0
        ? enPassantTargets.join(";")
        : "none"}`
    ].join("\n");
  }

  protected abstract applyRulesPostMove(game: Game): void;

  abstract endGame(game: Game): void;

  protected abstract getActiveChecks(
    board: Board,
    players: Iterable<Color>
  ): Map<string, Color[]>;

  public getCheckInfos(player: Color, game: Game): Map<string, Color[]> {
    return this.getActiveChecks(game.getBoard(), [player]);
  }
  
  public getLegalMoves(pieceId: string, game: Game): Move[] {
    const board = game.getBoard();
    const selectedPiece = board.getPiece(pieceId);
    if (!selectedPiece) return [];

    const from = board.getPositionOf(pieceId)!;

    if (
      game.isPlayerCheckMated(selectedPiece.color) ||
      game.isPlayerStalled(selectedPiece.color)
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
        RuleSet.PLAYER_COLORS
    );

    return ![...checks.values()].some(colors => colors.includes(color));
  }

  protected abstract withPawnSpecialMoves(
    pawn: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): Move[];

  protected abstract canDoubleSteps(pawn: Piece, from: number): boolean;
  
  abstract getCastleMoves(player: Color, game: Game): Move[];

  abstract getEnPassantMoves(pawn: Piece, from: number, game: Game): Move[] | undefined;

  abstract promotion(pawn: Piece, from: number): Move | undefined;

  abstract updateGameState(game: Game): void;

  abstract isDrawBy50MovesRule(game: Game): boolean;

  abstract isDrawByInsufficientMaterial(game: Game): boolean;
  
  protected getActivePlayers(game: Game): Color[] {
    return RuleSet.PLAYER_COLORS.filter(color =>
      game.isPlayerActive(color)
    );
  }

  public claimVictory(player: Color, game: Game): boolean {
    // A player may only claim victory when exactly two active players remain.
    const activePlayers = this.getActivePlayers(game);

    if (activePlayers.length !== 2)
      return false;

    const otherPlayer = activePlayers.find(color => color !== player)!;

    const playerScore = game.getPlayer(player).getScore();
    const otherPlayerScore = game.getPlayer(otherPlayer).getScore();

    // The claim is only valid if the leading player is ahead by at least
    // 21 points. Awarding 20 points to the opponent can therefore never
    // change the final winner.
    if (playerScore - otherPlayerScore <= 20)
      return false;

    // End the game immediately by eliminating the claimant.
    game.resignPlayer(player);

    // The remaining player receives the standard 20 resignation points.
    this.awardPlayerPoints(otherPlayer, 20, game);

    this.endGame(game);

    return true;
  }

  protected awardPlayerPoints(
      color: Color,
      points: number,
      game: Game
  ): void {
      game.incrementPlayerScore(color, points);
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

  public isDrawByTripleRepetition(game: Game): boolean {
    return game.getPositionCount(
      this.computePositionKey(game)
    ) >= 3;
  }
}
