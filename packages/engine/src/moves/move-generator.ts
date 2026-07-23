import { Board } from "../board";
import { Color, Piece, PieceType } from "../types";
import { bishopMoves } from "./bishop-moves";
import { kingMoves } from "./king-moves";
import { knightMoves } from "./knight-moves";
import { CastleSide, Move, PawnSpecialMove } from "./move";
import { pawnMoves } from "./pawn-moves";
import { queenMoves } from "./queen-moves";
import { rookMoves } from "./rook-moves";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

/**
 * Computes movement patterns for pieces on a {@link Board}, independent of
 * check or legality considerations.
 *
 * All moves produced by this class are **pseudo-legal** in the strict
 * sense used throughout the chess4 codebase: they respect each piece
 * type's base movement pattern (including standard captures, and sliding
 * pieces stopping at the first occupied square), but do **not** account
 * for whether making the move would leave the mover's own king in check.
 * They also do **not** include special pawn moves (double-step, en
 * passant, promotion) or castling — those are computed separately by
 * {@link RuleSet} and its subclasses, which layer on top of the moves
 * generated here.
 *
 * `MoveGenerator` has no knowledge of turn order, game history, or player
 * state — it operates purely on a `Board` snapshot.
 */
export class MoveGenerator {
  /**
   * Constructs a {@link Move} object from its components.
   *
   * This is a plain data-assembly helper; it performs no validation of
   * its inputs (e.g. it does not check that `destination` is reachable
   * by the piece, or that `castle`/`pawnSpecialMove` are consistent with
   * the piece type).
   *
   * @param pieceId - The id of the piece being moved.
   * @param from - The square id the piece moves from.
   * @param destination - The square id the piece moves to.
   * @param castle - The castling side, if this move is a castle (see
   * {@link CastleSide}).
   * @param pawnSpecialMove - The special pawn move type, if applicable
   * (see {@link PawnSpecialMove}).
   * @returns The assembled move. Note `capture` is not set here — it is
   * resolved later by {@link RuleSet.applyMoveOnBoard}.
   */
  public buildMove(
    pieceId: string,
    from: number,
    destination: number,
    castle?: CastleSide,
    pawnSpecialMove?: PawnSpecialMove
  ): Move {
    return {
      pieceId,
      from,
      to: destination,
      castle,
      pawnSpecialMove
    };
  }

  /**
   * Computes the pseudo-legal destination squares for a single piece,
   * dispatching to the appropriate movement pattern based on its type.
   *
   * @param piece - The piece to generate moves for.
   * @param board - The board to evaluate against.
   * @returns An array of reachable square ids. Always empty if the piece
   * is not currently placed on `board`, or if it is marked inactive (see
   * {@link Piece.active}).
   */
  public generateMovesForPiece(
    piece: Piece,
    board: Board
  ): number[] {
    const piecePosition = board.getPositionOf(piece.id);
    if (piecePosition === undefined) return [];
    if (!piece.active) return [];

    switch (piece.type) {
      case PieceType.KNIGHT:
        return knightMoves(piece, piecePosition, board);
      case PieceType.BISHOP:
        return bishopMoves(piece, board);
      case PieceType.ROOK:
        return rookMoves(piece, board);
      case PieceType.QUEEN:
        return queenMoves(piece, board);
      case PieceType.PAWN:
        return pawnMoves(piece, piecePosition, board);
      case PieceType.KING:
        return kingMoves(piece, piecePosition, board);
    }
  }

  /**
   * Computes the set of all squares currently reachable by any opponent
   * of `color`, typically used to determine whether a square is "attacked"
   * (e.g. to forbid a king from castling through or into check — see
   * {@link DefaultRuleSet.getCastleMoves}).
   *
   * As with all moves in this class, this is based on pseudo-legal
   * movement patterns rather than fully legal moves — consistent with
   * standard chess convention, where castling is blocked by any square an
   * opponent piece could reach, regardless of whether that opponent's own
   * move would itself be fully legal (e.g. even if it would expose their
   * own king).
   *
   * @param board - The board to evaluate against.
   * @param color - The color whose opponents' reachable squares should be
   * computed (i.e. every other color is treated as an opponent).
   * @returns The set of all square ids reachable by any opponent piece.
   */
  public generateAllOpponentsMoves(
    board: Board,
    color: Color
  ): Set<number> {
    const opponentsMoves = new Set<number>();
    const opponentColors = PLAYER_COLORS.filter(playerColor => playerColor !== color);

    for (const opponentColor of opponentColors) {
      for (const move of this.generatePseudoLegalMoves(board, opponentColor)) {
        opponentsMoves.add(move.to);
      }
    }

    return opponentsMoves;
  }

  /**
   * Computes every pseudo-legal move available to all of a single
   * color's pieces.
   *
   * @param board - The board to evaluate against.
   * @param color - The color whose pieces should be evaluated.
   * @returns An array of pseudo-legal moves for every active piece of
   * `color` currently on the board.
   */
  public generatePseudoLegalMoves(
    board: Board,
    color: Color
  ): Move[] {
    const moves: Move[] = [];

    for (const [squareId, pieceId] of board.getOccupiedSquaresByColor(color)) {
      const piece = board.getPiece(pieceId);
      if (!piece) continue;

      for (const destination of this.generateMovesForPiece(piece, board)) {
        moves.push(this.buildMove(pieceId, squareId, destination));
      }
    }

    return moves;
  }
}