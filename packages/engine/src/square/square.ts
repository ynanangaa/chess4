import { Piece } from "../pieces";
import { SquareCoords } from "../types";

export interface Square {
  id: number;
  coords: SquareCoords;
  occupant?: Piece; // the piece which occupies the square
}
