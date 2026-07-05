export interface Move {
  pieceId: string;
  from: number;
  to: number;
  // from and to are square ids
  
  castle?: "kingside" | "queenside";
  pawnSpecialMove?: "doublestep" | "e-p" | "promotion";
}
