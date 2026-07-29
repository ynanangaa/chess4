import { Board } from "../board";
import { Color, Piece, PieceType } from "../types";
import { bishopMoves } from "./bishop-moves";
import { kingMoves } from "./king-moves";
import { knightMoves } from "./knight-moves";
import { CastleSide, Move, PawnSpecialMove } from "./move";
import { pawnMoves } from "./pawn-moves";
import { queenMoves } from "./queen-moves";
import { rookMoves } from "./rook-moves";

/**
 * Computes movement patterns for pieces on a {@link Board}, independent of
 * check or legality considerations.
 *
 * All moves produced by this class are **pseudo-legal**: they respect
 * each piece type's base movement pattern (including standard captures,
 * and sliding pieces stopping at the first occupied square), but do
 * **not** account for whether making the move would leave the mover's
 * own king in check, nor for special pawn moves or castling — those are
 * layered on top by `RuleSet`.
 *
 * `MoveGenerator` has no knowledge of turn order, game history, or
 * player status — it operates purely on a `Board` snapshot, and treats
 * every piece it finds on the board as able to move. It is the caller's
 * responsibility to never request moves for, or to discard moves
 * belonging to, a color whose `PlayerStatus` currently marks it
 * inactive — `MoveGenerator` has no way to know that itself.
 */
export class MoveGenerator {
  /**
   * Constructs a {@link Move} object from its components.
   *
   * This is a plain data-assembly helper; it performs no validation of
   * its inputs.
   *
   * @param pieceId - The id of the piece being moved.
   * @param from - The square id the piece moves from.
   * @param destination - The square id the piece moves to.
   * @param castle - The castling side, if this move is a castle.
   * @param pawnSpecialMove - The special pawn move type, if applicable.
   * @returns The assembled move. `capture` is not set here — it is
   * resolved later by `RuleSet.applyMoveOnBoard`.
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
   * is not currently placed on `board`.
   */
  public generateMovesForPiece(
    piece: Piece,
    board: Board
  ): number[] {
    const piecePosition = board.getSquareOf(piece.id);
    if (piecePosition === undefined) return [];
    if (!board.isPieceActive(piece.id)) return [];

    switch (piece.type) {
      case PieceType.KNIGHT:
        return knightMoves(piece, piecePosition, board);
      case PieceType.BISHOP:
        return bishopMoves(piece, piecePosition, board);
      case PieceType.ROOK:
        return rookMoves(piece, piecePosition, board);
      case PieceType.QUEEN:
        return queenMoves(piece, piecePosition, board);
      case PieceType.PAWN:
        return pawnMoves(piece, piecePosition, board);
      case PieceType.KING:
        return kingMoves(piece, piecePosition, board);
    }
  }

  /**
   * Computes the set of all squares reachable by any piece belonging to
   * one of `opponentColors`, typically used to determine whether a
   * square is "attacked" (e.g. to forbid castling through or into
   * check — see `DefaultRuleSet.getCastleMoves`).
   *
   * As with all moves in this class, this is based on pseudo-legal
   * movement patterns. Callers are responsible for only including
   * currently-active colors in `opponentColors` — this method has no
   * way to exclude an eliminated player's frozen pieces itself.
   *
   * @param board - The board to evaluate against.
   * @param opponentColors - The colors whose pieces' reachable squares
   * should be computed.
   * @returns The set of all square ids reachable by any piece of any
   * color in `opponentColors`.
   */
  public generateAllOpponentsMoves(
    board: Board,
    opponentColors: Color[]
  ): Set<number> {
    const opponentsMoves = new Set<number>();

    for (const opponentColor of opponentColors) {
      for (const move of this.generatePseudoLegalMoves(board, opponentColor)) {
        opponentsMoves.add(move.to);
      }
    }

    return opponentsMoves;
  }

  /**
   * Computes every pseudo-legal move available to all of a single
   * color's pieces currently on the board.
   *
   * @param board - The board to evaluate against.
   * @param color - The color whose pieces should be evaluated. Callers
   * should not invoke this for a color whose `PlayerStatus` currently
   * marks it inactive.
   * @returns An array of pseudo-legal moves for every piece of `color`
   * currently on the board.
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