// Position interface representing a square on the chessboard
export interface Position {
  row: number;
  col: string;
}

// PositionOffset interface representing a change in position (row and column deltas)
export interface PositionOffset {
  rowDelta: number;
  colDelta: number;
}
