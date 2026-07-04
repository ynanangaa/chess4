export interface Move {
  pieceId: string;
  from: number;
  to: number;
  // from and to are square ids
  
  castle?: "kingside" | "queenside";
  enPassant?: true;
}
