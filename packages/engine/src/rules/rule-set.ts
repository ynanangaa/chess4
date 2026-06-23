import { Move } from '../moves/move';

export interface RuleSet {
  // Return true if the move is valid according to the ruleset
  isValidMove(move: Move): boolean;

  // Get the color of the player whose turn it is to move
  getCurrentPlayerColor(): string;

  // Get legal moves for a piece on the board
  getLegalMoves(pieceId: string): Move[];

  // Return true if the king of the given color can castle on the given side (kingSide=true for kingside, false for queenside)
  canCastle(color: string, kingSide: boolean): boolean;

  // Return true if a pawn can take en passant on the given square (position) for the given color
  canEnPassant(color: string, position: string): boolean;

  // Return true if there is a check condition for the given player color
  isCheck(color: string): boolean;
  
  // Return true if there is a checkmate condition for the given player color
  isCheckmate(color: string): boolean;

  // Return true if there is a stalemate condition for the given player color
  isStalemate(color: string): boolean;

  // Return true if the game is over (checkmate or stalemate)
  isGameOver(): boolean;
}