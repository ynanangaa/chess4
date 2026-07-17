import { Color } from "../types";

export type CastleSide = "kingside" | "queenside";
export type PawnSpecialMove = "doublestep" | "e-p" | "promotion";

export interface Move {
  pieceId: string;
  from: number;
  to: number;
  capture?: string;
  castle?: CastleSide;
  pawnSpecialMove?: PawnSpecialMove;
  check?: Map<string, Color[]>;
}
