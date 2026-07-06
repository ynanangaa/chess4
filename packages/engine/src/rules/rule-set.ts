import { Game } from '../game/game';
import { Move } from '../moves/move';
import { Color, Piece } from '../types';
import { GameState } from '../game/game-state';
import { Board } from '../board';

export interface RuleSet {
  // Return true if the move is valid according to the ruleset
  isValidMove(move: Move): boolean;

  // Get the color of the player whose turn it is to move in the game
  getCurrentPlayer(game: Game): Color;

  // Get legal moves for a piece on the board
  getLegalMoves(pieceId: string, game: Game): Move[];

  // Return true if the king of the given color can castle on the given side (kingSide=true for kingside, false for queenside)
  getCastleMoves(player: Color, game: Game): Move[];

  // Return true if the pawn of the given id can move two squares forward, for the given player color
  canDoubleSteps(pawn: Piece, from: number): boolean;

  // Return true if a pawn of the given id can take en passant, for the given player color
  getEnPassantMove(pawn: Piece, from: number, game: Game): Move | undefined;

  // Pawn promotion
  promotion(pawn: Piece, from: number): Move | undefined;

  // Calculate and return the game state
  updateGameState(game: Game): GameState;

  // Return colors of the players in check status following a move
  getCheckInfos(player: Color, game: Game): Map<string, Color[]>;
}