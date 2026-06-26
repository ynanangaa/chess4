import { Game } from '../game/game';
import { Move } from '../moves/move';
import { PlayerColor } from '../players/player-color';
import { GameState } from '../states/game-state';

export interface RuleSet {
  // Return true if the move is valid according to the ruleset
  isValidMove(move: Move): boolean;

  // Get the color of the player whose turn it is to move in the game
  getCurrentPlayer(game: Game): PlayerColor;

  // Get legal moves for a piece on the board
  getLegalMoves(game: Game, pieceId: string): Move[];

  // Return true if the king of the given color can castle on the given side (kingSide=true for kingside, false for queenside)
  canCastle(game: Game, player: PlayerColor, kingSide: boolean): boolean;

  // Return true if the pawn of the given id can move two squares forward, for the given player color
  canDoubleSteps(game: Game, player: PlayerColor, pawnId: string): boolean;

  // Return true if a pawn of the given id can take en passant, for the given player color
  canEnPassant(game: Game, pawnId: string): boolean;

  // Calculate and return the game state
  getGameState(game: Game): GameState;
}