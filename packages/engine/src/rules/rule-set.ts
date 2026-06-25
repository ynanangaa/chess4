import { Game } from '../game/game';
import { Move } from '../moves/move';
import { Player } from '../players/player';

export interface RuleSet {
  // Return true if the move is valid according to the ruleset
  isValidMove(move: Move): boolean;

  // Get the player of the player whose turn it is to move in the game
  getCurrentPlayer(game: Game): Player;

  // Get legal moves for a piece on the board
  getLegalMoves(game: Game, pieceId: string): Move[];

  // Return true if the king of the given player can castle on the given side (kingSide=true for kingside, false for queenside)
  canCastle(game: Game, player: Player, kingSide: boolean): boolean;

  // Return true if a pawn can take en passant on the given square (position) for the given player
  canEnPassant(game: Game, player: Player, position: string): boolean;

  // Return true if there is a check condition for the given player in the game
  isCheck(game: Game, player: Player): boolean;
  
  // Return true if there is a checkmate condition for the given player in the game
  isCheckmate(game: Game, player: Player): boolean;

  // Return true if there is a stalemate condition for the given player in the game
  isStalemate(game: Game, player: Player): boolean;

  // Return true if the game is over
  isGameOver(game: Game): boolean;
}