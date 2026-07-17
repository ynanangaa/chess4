import { Color } from "../types";

export interface Move {
  pieceId: string;
  from: number;
  to: number;
  // from and to are square ids
  
  capture?: string;
  castle?: "kingside" | "queenside";
  pawnSpecialMove?: "doublestep" | "e-p" | "promotion";
  check?: Map<string, Color[]>;
}
