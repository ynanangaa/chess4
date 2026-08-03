import {
  DefaultRuleSet,
  Game,
  Move,
  MoveGenerator,
  Piece,
  Color,
  SquareCoords,
} from '../src';
import { getMutableGameInternals } from '../src/game';

type InitialPosition = [Piece[], number[]];

export function createClassicGame(initialPosition: InitialPosition): Game {
  return new Game(new DefaultRuleSet(new MoveGenerator()), initialPosition);
}

export function findMoveTo(game: Game, pieceId: string, to: number): Move | undefined {
  return game.getLegalMoves(pieceId).find(move => move.to === to);
}

export function advanceToPlayer(game: Game, color: Color): void {
  while (game.getCurrentPlayerColor() !== color) {
    getMutableGameInternals(game).advanceCurrentPlayer();
  }
}

export function sortMoves(moves: SquareCoords[]): SquareCoords[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}
