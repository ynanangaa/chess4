import { Game } from "../game";
import { Move, MoveGenerator } from "../moves";
import { Color, Piece } from "../types";

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

  abstract isPlayerMate(player: Color, game: Game): boolean;
}
