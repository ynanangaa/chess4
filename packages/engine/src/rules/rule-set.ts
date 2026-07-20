import { Game } from "../game";
import { Move, MoveGenerator } from "../moves";
import { Color, Piece, PlayerState } from "../types";

export abstract class RuleSet {

  constructor(
    protected readonly moveGenerator: MoveGenerator
  ) {}

  abstract applyMove(move: Move, game: Game): boolean;
  
  abstract getLegalMoves(pieceId: string, game: Game): Move[];

  abstract getCastleMoves(player: Color, game: Game): Move[];

  abstract canDoubleSteps(pawn: Piece, from: number): boolean;

  abstract getEnPassantMove(pawn: Piece, from: number, game: Game): Move | undefined;

  abstract promotion(pawn: Piece, from: number): Move | undefined;

  abstract updateGameState(game: Game): void;

  abstract getCheckInfos(player: Color, game: Game): Map<string, Color[]>;

  public isPlayerMate(player: Color, game: Game): boolean {
    const board = game.getBoard();
    const pieces = board.getPiecesByColor(player);

    for (const piece of pieces) {
      if (this.getLegalMoves(piece.id, game).length > 0) {
        return false;
      }
    }

    return true;
  }

  public isPlayerStalled(player: Color, game: Game): boolean {
    if(game.getPlayerState(player) === PlayerState.STALEMATE)
      return true;
    return (
      game.isPlayerResignedOrTimedOut(player) && 
      this.isPlayerMate(player, game)
    );
  }
}
