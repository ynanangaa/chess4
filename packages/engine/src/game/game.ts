import { Board } from "../board";
import { Move, rookCastleDirectionOffset } from "../moves";
import { enPassantCapturedPawnSquare } from "../moves/pawn-moves";
import { Player } from "../players";
import { RuleSet } from "../rules";
import { Color, Piece, PieceType } from "../types";
import { GameState } from "./game-state";

const NEXT_PLAYER_COLOR = new Map<Color, Color>([
  [Color.RED, Color.BLUE],
  [Color.BLUE, Color.YELLOW],
  [Color.YELLOW, Color.GREEN],
  [Color.GREEN, Color.RED]
]);

export class Game {
  private board: Board;
  private history: Move[];
  private movedPieces = new Set<string>();
  private players: Player[];
  private gameState: GameState;

  constructor(
    private ruleSet: RuleSet,
    initialPieces?: [Piece[], number[]],
    history?: Move[]
  ) {
    this.board = new Board(initialPieces);
    this.history = history ? history.slice() : [];
    this.players = [
      new Player("P1", Color.RED),
      new Player("P2", Color.BLUE),
      new Player("P3", Color.YELLOW),
      new Player("P4", Color.GREEN)
    ];
    this.gameState = new GameState();
  }

  public destroy(): void {
    this.history.length = 0;
    this.movedPieces.clear();
  }

  public applyMove(move: Move): boolean {
    let appliedMove = this.withDirectCapture(move);
    const movedPiece = this.board.placePiece(move.pieceId, move.to);
    if (!movedPiece) return false;

    appliedMove = this.applyEnPassantCapture(appliedMove);
    this.applyPromotion(move);
    this.applyCastling(move);
    this.recordMove(appliedMove, movedPiece.color);

    this.movedPieces.add(appliedMove.pieceId);
    this.updateGameState();

    return true;
  }

  public getBoard(): Board {
    return this.board;
  }

  public getHistory(): Move[] {
    return this.history.slice();
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getCurrentPlayerColor(): Color {
    if (this.history.length === 0) return Color.RED;

    const lastMove = this.history[this.history.length - 1];
    const previousColor = this.board.getPiece(lastMove.pieceId)!.color;

    return NEXT_PLAYER_COLOR.get(previousColor)!;
  }

  public getLegalMoves(pieceId: string): Move[] {
    return this.ruleSet.getLegalMoves(pieceId, this);
  }

  public hasPieceMoved(pieceId: string): boolean {
    return this.movedPieces.has(pieceId);
  }

  private updateGameState(): void {
    this.gameState = this.ruleSet.updateGameState(this);
  }

  private withDirectCapture(move: Move): Move {
    const capturedPiece = this.board.getPieceAt(move.to);

    if (!capturedPiece) return move;

    return { ...move, capture: capturedPiece.id };
  }

  private applyEnPassantCapture(move: Move): Move {
    const capturedPieceId = this.getCapturedPieceIdForEnPassant(move);
    if (!capturedPieceId) return move;

    this.board.removePiece(capturedPieceId);

    return { ...move, capture: capturedPieceId };
  }

  private getCapturedPieceIdForEnPassant(move: Move): string | undefined {
    if (move.pawnSpecialMove !== "e-p") return undefined;

    const movingPiece = this.board.getPiece(move.pieceId);
    if (!movingPiece || movingPiece.type !== PieceType.PAWN) return undefined;

    const capturedSquare = enPassantCapturedPawnSquare(move.to, movingPiece.color);
    const capturedPiece = this.board.getPieceAt(capturedSquare);
    if (!capturedPiece || capturedPiece.color === movingPiece.color) return undefined;

    return capturedPiece.id;
  }

  private applyPromotion(move: Move): void {
    if (move.pawnSpecialMove === "promotion") {
      this.board.setPromotionPieceType(move.pieceId, PieceType.QUEEN);
    }
  }

  private applyCastling(move: Move): void {
    if (!move.castle) return;

    const color = this.board.getPiece(move.pieceId)!.color;
    const rookId = `R-${color}-${move.castle}`;

    this.board.placePiece(
      rookId,
      move.to + rookCastleDirectionOffset(color, move.castle)
    );
    this.movedPieces.add(rookId);
  }

  private recordMove(move: Move, color: Color): void {
    const checkInfos = this.ruleSet.getCheckInfos(color, this);

    this.history.push(
      checkInfos.size > 0
        ? { ...move, check: checkInfos }
        : move
    );
  }
}
