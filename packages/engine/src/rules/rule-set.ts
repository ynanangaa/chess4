import { Game } from '../game/game';
import { Move } from '../moves/move';
import { Color } from '../types';
import { GameState } from '../game/game-state';

export interface RuleSet {
  // Return true if the move is valid according to the ruleset
  isValidMove(move: Move): boolean;

  // Get the color of the player whose turn it is to move in the game
  getCurrentPlayer(game: Game): Color;

  // Get legal moves for a piece on the board
  getLegalMoves(game: Game, pieceId: string): Move[];

  // Return true if the king of the given color can castle on the given side (kingSide=true for kingside, false for queenside)
  canCastle(game: Game, player: Color, kingSide: boolean): boolean;

  // Return true if the pawn of the given id can move two squares forward, for the given player color
  canDoubleSteps(game: Game, player: Color, pawnId: string): boolean;

  // Return true if a pawn of the given id can take en passant, for the given player color
  canEnPassant(game: Game, pawnId: string): boolean;

  // Calculate and return the game state
  getGameState(game: Game): GameState;
}