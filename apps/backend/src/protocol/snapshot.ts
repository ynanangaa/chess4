import { Color, Game, PlayerStatus } from '@chess4/engine';
import type { GameSnapshot } from './messages';

const PLAYER_COLORS: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

export function buildSnapshot(game: Game): GameSnapshot {
  const board = game.getBoard();

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

  return {
    pieces,
    currentPlayer: game.getCurrentPlayerColor(),
    isOver: game.isOver(),
    statuses,
    scores,
    capturedPieces: game.getAllCapturedPieces(),
    historyLength: game.getHistory().length,
  };
}