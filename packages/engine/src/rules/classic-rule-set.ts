import { Board } from "../board";
import { Game, GameState } from "../game";
import { castleDirectionOffset, forwardDirection, Move, MoveGenerator } from "../moves";
import { Color, GameStatus, Piece, PieceType, PlayerState } from "../types";
import { kingInitialSquareId, rookInitialSquareId } from "../utils";
import { EN_PASSANT_SQUARES_IDS } from "./en-passant-squares-ids";
import { RuleSet } from "./rule-set";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export class ClassicRuleSet implements RuleSet {
  constructor(
    private readonly moveGenerator: MoveGenerator
  ) {}

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

    let allOpponentsMoves: Set<number> = new Set();

    if (
      selectedPiece.type === PieceType.KING &&
      playerState !== PlayerState.CHECK
    ) {
      allOpponentsMoves = this.moveGenerator
        .generateAllOpponentsMoves(board, selectedPiece.color);
    }

    if (playerState === PlayerState.CHECK) {
      const checkedMoves = this.filterMovesWhileInCheck(
        selectedPiece,
        from,
        game,
        moves
      );

      moves = checkedMoves.moves;
      allOpponentsMoves = checkedMoves.allOpponentsMoves;
    }

    if (selectedPiece.type === PieceType.KING) {
      moves = moves.filter(move => !allOpponentsMoves.has(move.to));
    }

    return moves;
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

  private filterMovesWhileInCheck(
    selectedPiece: Piece,
    from: number,
    game: Game,
    moves: Move[]
  ): { moves: Move[]; allOpponentsMoves: Set<number> } {
    const board = game.getBoard();
    const boardClone = board.clone();
    let allOpponentsMoves: Set<number> = new Set();

    const activeChecks = this.getActiveChecks(
      board,
      PLAYER_COLORS
    );

    for (const attackerId of activeChecks.keys()) {
      boardClone.removePiece(attackerId);
    }

    allOpponentsMoves = this.moveGenerator.generateAllOpponentsMoves(
      boardClone,
      selectedPiece.color
    );

    for (const [attackerId, checkedColors] of activeChecks) {
      if (!checkedColors.includes(selectedPiece.color)) continue;

      moves = this.filterMovesAgainstChecker(
        selectedPiece,
        from,
        attackerId,
        board,
        moves
      );
    }

    return { moves, allOpponentsMoves };
  }

  private filterMovesAgainstChecker(
    selectedPiece: Piece,
    from: number,
    attackerId: string,
    board: Board,
    moves: Move[]
  ): Move[] {
    const attackerPos = board.getPositionOf(attackerId)!;
    const attackRayToKing = this.getAttackRayToKing(
      attackerId,
      selectedPiece.color,
      board
    );

    if (selectedPiece.type !== PieceType.KING) {
      if (attackRayToKing.length === 0) {
        // Knight checks cannot be blocked; only capturing the attacker helps.
        return moves.filter(move => move.to === attackerPos);
      }

      // Sliding attacks can be answered by capture or interposition.
      return moves.filter(move => attackRayToKing.includes(move.to));
    }

    const attacker = board.getPiece(attackerId)!;
    const attackerMoves = new Set(
      this.moveGenerator.generateMovesForPiece(attacker, board)
    );

    moves = moves.filter(move => !attackerMoves.has(move.to));

    const forbidden = attackRayToKing.length > 0
      ? [attackRayToKing[attackRayToKing.length - 1]]
      : [from - 15, from - 13, from + 13, from + 15];

    return moves.filter(move => !forbidden.includes(move.to));
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
    else return [];

    const direction = delta > 0 ? 1 : -1;
    const result: number[] = [];

    for (
      let pos = attackerPos;
      pos !== kingPos;
      pos += direction * step
    ) {
      result.push(pos);
    }

    // Also forbid the square just beyond the king on the same attack line.
    result.push(kingPos + direction * step);

    return result;
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

    const checkedColors: Color[] = [];

    for (const colors of activeChecks.values()) {
      checkedColors.push(...colors);
    }

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
