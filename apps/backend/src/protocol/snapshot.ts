import { Color, Game, Move, PlayerStatus } from '@chess4/engine';
import type { GameSnapshot, RoomSnapshot } from './messages';
import { GameRoom } from '../rooms/game-room';

const PLAYER_COLORS: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export function buildSnapshot(game: Game): GameSnapshot {
  const board = game.getBoard();
  const currentPlayer = game.getCurrentPlayerColor();

  const pieces = Array.from(board.getOccupiedSquares().entries()).map(
    ([squareId, pieceId]) => {
      const piece = board.getPiece(pieceId)!;

      return {
        id: piece.id,
        type: piece.type,
        color: piece.color,
        points: piece.points,
        squareId,
        active: board.isPieceActive(piece.id),
      };
    }
  );

  const statuses = Object.fromEntries(
    PLAYER_COLORS.map(color => [color, game.getPlayerStatus(color)])
  ) as Record<Color, PlayerStatus>;

  const scores = Object.fromEntries(
    PLAYER_COLORS.map(color => [color, game.getPlayer(color).getScore()])
  ) as Record<Color, number>;

  const legalMoves: Record<string, Move[]> = {};
  if (!game.isOver()) {
    for (const piece of board.getPiecesByColor(currentPlayer)) {
      const moves = game.getLegalMoves(piece.id);
      if (moves.length > 0) legalMoves[piece.id] = moves;
    }
  }

  return {
    pieces,
    currentPlayer,
    isOver: game.isOver(),
    statuses,
    scores,
    capturedPieces: game.getAllCapturedPieces(),
    historyLength: game.getHistory().length,
    legalMoves
  };
}

/** Builds the wire-format seat-occupancy snapshot for a {@link GameRoom}. */
export function buildRoomSnapshot(room: GameRoom): RoomSnapshot {
  return {
    roomCode: room.code,
    occupiedSeats: room.getOccupiedSeats(),
    hasStarted: room.hasStarted(),
  };
}