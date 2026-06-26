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

  // Return true if a pawn can take en passant on the given square (position) for the given player
  canEnPassant(game: Game, player: PlayerColor, position: string): boolean;

  // Calculate and return the game state
  getGameState(game: Game): GameState;
}