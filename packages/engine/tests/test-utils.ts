import {
  ClassicRuleSet,
  Game,
  Move,
  MoveGenerator,
  Piece,
  SquareCoords
} from '../src';

type InitialPosition = [Piece[], number[]];

export function createClassicGame(initialPosition: InitialPosition): Game {
  return new Game(new ClassicRuleSet(new MoveGenerator()), initialPosition);
}

export function findMoveTo(game: Game, pieceId: string, to: number): Move | undefined {
  return game.getLegalMoves(pieceId).find(move => move.to === to);
}

export function sortMoves(moves: SquareCoords[]): SquareCoords[] {
  return [...moves].sort((a, b) =>
    a.row === b.row ? a.col.localeCompare(b.col) : a.row - b.row
  );
}
