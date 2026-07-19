import { Board } from "../board";
import { Color, Piece, PieceType } from "../types";
import { bishopMoves } from "./bishop-moves";
import { kingMoves } from "./king-moves";
import { knightMoves } from "./knight-moves";
import { Move } from "./move";
import { pawnMoves } from "./pawn-moves";
import { queenMoves } from "./queen-moves";
import { rookMoves } from "./rook-moves";

const PLAYER_COLORS = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export class MoveGenerator {
  public buildMove(
    pieceId: string,
    from: number,
    destination: number,
    castle?: "kingside" | "queenside",
    pawnSpecialMove?: "doublestep" | "e-p" | "promotion"
  ): Move {
    return {
      pieceId,
      from,
      to: destination,
      castle,
      pawnSpecialMove
    };
  }

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
