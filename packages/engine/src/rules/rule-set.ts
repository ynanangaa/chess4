import { Game, GameState } from "../game";
import { Move } from "../moves";
import { Color, Piece } from "../types";

export interface RuleSet {
  getLegalMoves(pieceId: string, game: Game): Move[];

  getCastleMoves(player: Color, game: Game): Move[];

  canDoubleSteps(pawn: Piece, from: number): boolean;

  getEnPassantMove(pawn: Piece, from: number, game: Game): Move | undefined;

  promotion(pawn: Piece, from: number): Move | undefined;

  updateGameState(game: Game): GameState;

  getCheckInfos(player: Color, game: Game): Map<string, Color[]>;

  isPlayerMate(player: Color, game: Game): boolean;
}
