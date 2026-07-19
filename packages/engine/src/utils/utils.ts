import { Board } from "../board";
import { Col, Color, Piece, PieceType, Row, SquareCoords, SquareCoordsOffset } from "../types";

const BOARD_SIZE = 14;
const FIRST_VALID_SQUARE = 1;
const LAST_VALID_SQUARE = BOARD_SIZE;
const PLAYER_SIDES = [true, false];

export function parseSquareId(row: number, col: number): number {
  return BOARD_SIZE * (col - 1) + row - 1;
}

export function validBoardSquares(): Set<number> {
  const validSquares = new Set<number>();

  addSquareRange(validSquares, 4, 11, 1, 3);
  addSquareRange(validSquares, 1, 14, 4, 11);
  addSquareRange(validSquares, 4, 11, 12, 14);

  return validSquares;
}

function addSquareRange(
  squares: Set<number>,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): void {
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      squares.add(parseSquareId(row, col));
    }
  }
}

export function parseCol(col: number): Col {
  return String.fromCharCode(96 + col) as Col;
}

export function inverseParseCol(col: Col): number {
  return col.charCodeAt(0) - 96;
}

export function parseRow(row: number): Row {
  return row as Row;
}

export function parseSquareCoords(id: number): SquareCoords {
  return {
    row: parseRow(id % BOARD_SIZE + 1),
    col: parseCol(Math.trunc(id / BOARD_SIZE) + 1)
  };
}

export function translateSquareCoords(
  coords: SquareCoords,
  offset: SquareCoordsOffset
): SquareCoords | undefined {
  const row = coords.row + offset.rowDelta;
  const col = inverseParseCol(coords.col) + offset.colDelta;

  if (
    row < FIRST_VALID_SQUARE ||
    row > LAST_VALID_SQUARE ||
    col < FIRST_VALID_SQUARE ||
    col > LAST_VALID_SQUARE
  ) {
    return undefined;
  }

  return {
    row: parseRow(row),
    col: parseCol(col)
  };
}

export function areSameCoords(
  left: SquareCoords | undefined,
  right: SquareCoords | undefined
): boolean {
  return !!left && !!right && left.col === right.col && left.row === right.row;
}

export function isSamePiece(left: Piece | undefined, right: Piece | undefined): boolean {
  return (
    !!left &&
    !!right &&
    left.id === right.id &&
    left.type === right.type &&
    left.color === right.color
  );
}

export function createPieceId(color: Color, type: PieceType, pawnNum?: number): string {
  if (type === PieceType.PAWN && pawnNum !== undefined) {
    return `${color}-${pawnNum}`;
  }

  return `${type}-${color}`;
}

export function createDuplicatePieceId(
  color: Color,
  type: PieceType,
  kingSide: boolean
): string {
  return `${type}-${color}-${kingSide ? "kingside" : "queenside"}`;
}

export function buildPawn(color: Color, pawnNum: number): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.PAWN, pawnNum),
    color,
    type: PieceType.PAWN,
    points: 1
  };
}

export function pawnInitialSquareId(color: Color, pawnNum: number): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(2, 3 + pawnNum);
    case Color.YELLOW:
      return parseSquareId(13, 12 - pawnNum);
    case Color.BLUE:
      return parseSquareId(12 - pawnNum, 2);
    case Color.GREEN:
      return parseSquareId(3 + pawnNum, 13);
  }
}

export function buildDuplicatePiece(
  color: Color,
  type: PieceType,
  kingSide: boolean
): Piece {
  const points = type === PieceType.KNIGHT? 3: 5;
  return {
    active: true,
    id: createDuplicatePieceId(color, type, kingSide),
    color,
    type,
    points: points
  };
}

export function bishopInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 9 : 6);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 6 : 9);
    case Color.BLUE:
      return parseSquareId(kingSide ? 9 : 6, 1);
    case Color.GREEN:
      return parseSquareId(kingSide ? 6 : 9, 14);
  }
}

export function knightInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 10 : 5);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 5 : 10);
    case Color.BLUE:
      return parseSquareId(kingSide ? 10 : 5, 1);
    case Color.GREEN:
      return parseSquareId(kingSide ? 5 : 10, 14);
  }
}

export function rookInitialSquareId(color: Color, kingSide: boolean): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, kingSide ? 11 : 4);
    case Color.YELLOW:
      return parseSquareId(14, kingSide ? 4 : 11);
    case Color.BLUE:
      return parseSquareId(kingSide ? 11 : 4, 1);
    case Color.GREEN:
      return parseSquareId(kingSide ? 4 : 11, 14);
  }
}

export function queenInitialSquareId(color: Color): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, 7);
    case Color.YELLOW:
      return parseSquareId(14, 8);
    case Color.BLUE:
      return parseSquareId(7, 1);
    case Color.GREEN:
      return parseSquareId(8, 14);
  }
}

export function kingInitialSquareId(color: Color): number {
  switch (color) {
    case Color.RED:
      return parseSquareId(1, 8);
    case Color.YELLOW:
      return parseSquareId(14, 7);
    case Color.BLUE:
      return parseSquareId(8, 1);
    case Color.GREEN:
      return parseSquareId(7, 14);
  }
}

export function buildQueen(color: Color): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.QUEEN),
    color,
    type: PieceType.QUEEN,
    points: 9
  };
}

export function buildKing(color: Color): Piece {
  return {
    active: true,
    id: createPieceId(color, PieceType.KING),
    color,
    type: PieceType.KING
  };
}

export function initializePieces(color: Color): [Piece[], number[]] {
  const pieces: Piece[] = [];
  const initialSquareIds: number[] = [];

  for (let pawnNum = 1; pawnNum <= 8; pawnNum += 1) {
    pieces.push(buildPawn(color, pawnNum));
    initialSquareIds.push(pawnInitialSquareId(color, pawnNum));
  }

  for (const kingSide of PLAYER_SIDES) {
    pieces.push(buildDuplicatePiece(color, PieceType.ROOK, kingSide));
    initialSquareIds.push(rookInitialSquareId(color, kingSide));

    pieces.push(buildDuplicatePiece(color, PieceType.BISHOP, kingSide));
    initialSquareIds.push(bishopInitialSquareId(color, kingSide));

    pieces.push(buildDuplicatePiece(color, PieceType.KNIGHT, kingSide));
    initialSquareIds.push(knightInitialSquareId(color, kingSide));
  }

  pieces.push(buildQueen(color));
  initialSquareIds.push(queenInitialSquareId(color));

  pieces.push(buildKing(color));
  initialSquareIds.push(kingInitialSquareId(color));

  return [pieces, initialSquareIds];
}

export function pushIfOccupantIsEnemy(
  moves: number[],
  piece: Piece,
  board: Board,
  enemyPosition: number
): void {
  const occupant = board.getPieceAt(enemyPosition);

  if (occupant && occupant.color !== piece.color) {
    moves.push(enemyPosition);
  }
}

export function pushIfEmptyOrEnemy(
  moves: number[],
  piece: Piece,
  board: Board,
  targetPosition: number
): void {
  const occupant = board.getPieceAt(targetPosition);

  if (!occupant || occupant.color !== piece.color) {
    moves.push(targetPosition);
  }
}

export function toSquareId(coords: SquareCoords): number {
  return parseSquareId(coords.row, inverseParseCol(coords.col));
}

export function slidingMoves(
  pieceId: string,
  board: Board,
  offsets: SquareCoordsOffset[]
): number[] {
  const moves: number[] = [];
  const piecePosition = board.getPositionOf(pieceId);
  if (piecePosition === undefined) return moves;

  const piece = board.getPiece(pieceId);
  if (!piece) return moves;

  for (const offset of offsets) {
    let currentCoords = parseSquareCoords(piecePosition);

    while (true) {
      const translated = translateSquareCoords(currentCoords, offset);
      if (!translated) break;

      const newPosition = toSquareId(translated);
      if (!board.isValidSquare(newPosition)) break;

      const occupant = board.getPieceAt(newPosition);
      if (occupant) {
        if (occupant.color !== piece.color) {
          moves.push(newPosition);
        }
        break;
      }

      moves.push(newPosition);
      currentCoords = translated;
    }
  }

  return moves;
}
