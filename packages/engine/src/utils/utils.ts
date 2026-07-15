import { Board } from "../board";
import { Col, Color, Piece, PieceType, Row, SquareCoords, SquareCoordsOffset } from "../types";

export function parseSquareId(row: number, col: number): number {
    return 14 * (col - 1) + row - 1;
}

export function validBoardSquares(): Set<number> {
    const validSquares: Set<number> = new Set();
    for (let row=4; row<=11; row++) {
        for (let col=1; col<=3; col++)
            validSquares.add(parseSquareId(row, col));
    }
    for (let row=1; row<=14; row++) {
        for (let col=4; col<=11; col++)
            validSquares.add(parseSquareId(row, col));
    }
    for (let row=4; row<=11; row++) {
        for (let col=12; col<=14; col++)
            validSquares.add(parseSquareId(row, col));
    }
    return validSquares;
}

export function parseCol(col: number): Col {
    return String.fromCharCode(96 + col) as Col; // 96 = 97 - 1; 97 being Unicode(a)
}

export function inverseParseCol(col: Col): number {
    return col.charCodeAt(0) - 96;
}

export function parseRow(row: number): Row {
    return row as Row;
}

export function parseSquareCoords(id: number): SquareCoords {
    return { 
        row: parseRow(id % 14 + 1), 
        col: parseCol(Math.trunc(id / 14) + 1)
    }
}

export function translateSquareCoords(
    coords: SquareCoords, 
    offset: SquareCoordsOffset
): SquareCoords | undefined {
    const row = coords.row + offset.rowDelta;
    const col = inverseParseCol(coords.col) + offset.colDelta;
    if(row < 1 || row > 14 || col < 1 || col > 14) return undefined;
    return {
        row: parseRow(row),
        col: parseCol(col)
    }
}

export function areSameCoords(left: SquareCoords | undefined, right: SquareCoords | undefined) {
    return !!left && !!right && left.col === right.col && left.row === right.row;
}

export function isSamePiece(left: Piece | undefined, right: Piece | undefined): boolean {
    return (
        !!left && !!right && left.id === right.id && 
        left.id === right.type &&
        left.type === right.type && left.color === right.color
    );
}

export function createPieceId(color: Color, type: PieceType, pawnNum?: number): string {
    if (type === PieceType.PAWN && pawnNum) {
        return `${color}-${pawnNum}`;
    }
    return `${type}-${color}`;
}

export function createDuplicatePieceId(color: Color, type: PieceType, kingSide: boolean): string {
    if (kingSide) {
        return `${type}-${color}-kingside`;
    }
    return `${type}-${color}-queenside`;
}

export function buildPawn(color: Color, pawnNum: number): Piece {
    const id = createPieceId(color, PieceType.PAWN, pawnNum);
    return {
        id: id,
        color: color,
        type: PieceType.PAWN,
    }
}

export function pawnInitialSquareId(color: Color, pawnNum: number): number {
    switch(color) {
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

export function buildDuplicatePiece(color: Color, type: PieceType, kingSide: boolean): Piece {
    const id = createDuplicatePieceId(color, type, kingSide);
    return {
        id: id,
        color: color,
        type: type,
    }
}

export function bishopInitialSquareId(color: Color, kingSide: boolean): number {
    switch(color) {
        case Color.RED:
            return parseSquareId(1, kingSide ? 9: 6);
        case Color.YELLOW:
            return parseSquareId(14, kingSide ? 6: 9);
        case Color.BLUE:
            return parseSquareId(kingSide ? 9: 6, 1);
        case Color.GREEN:
            return parseSquareId(kingSide ? 6: 9, 14);
    }
}

export function knightInitialSquareId(color: Color, kingSide: boolean): number {
    switch(color) {
        case Color.RED:
            return parseSquareId(1, kingSide ? 10: 5);
        case Color.YELLOW:
            return parseSquareId(14, kingSide ? 5: 10);
        case Color.BLUE:
            return parseSquareId(kingSide ? 10: 5, 1);
        case Color.GREEN:
            return parseSquareId(kingSide ? 5: 10, 14);
    }
}

export function rookInitialSquareId(color: Color, kingSide: boolean): number {
    switch(color) {
        case Color.RED:
            return parseSquareId(1, kingSide ? 11: 4);
        case Color.YELLOW:
            return parseSquareId(14, kingSide ? 4: 11);
        case Color.BLUE:
            return parseSquareId(kingSide ? 11: 4, 1);
        case Color.GREEN:
            return parseSquareId(kingSide ? 4: 11, 14);
    }
}

export function queenInitialSquareId(color: Color): number {
    switch(color) {
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
    switch(color) {
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
    const id = createPieceId(color, PieceType.QUEEN);
    return {
        id: id,
        color: color,
        type: PieceType.QUEEN,
    }
}

export function buildKing(color: Color): Piece {
    const id = createPieceId(color, PieceType.KING);
    return {
        id: id,
        color: color,
        type: PieceType.KING,
    }
}



export function initializePieces(color: Color): [Piece[], number[]] {
    const pieces : Piece[] = [];
    const initialSquareIds: number[] = [];
    // Pawns
    for (let i=1; i<=8; i++) {
        pieces.push(buildPawn(color, i));
        initialSquareIds.push(pawnInitialSquareId(color, i));
    }
    // Duplicate Pieces : Rooks, Bishops and Knights
    for (const kingSide of [true, false]) {
        pieces.push(buildDuplicatePiece(color, PieceType.ROOK, kingSide));
        initialSquareIds.push(rookInitialSquareId(color, kingSide));
        pieces.push(buildDuplicatePiece(color, PieceType.BISHOP, kingSide));
        initialSquareIds.push(bishopInitialSquareId(color, kingSide));
        pieces.push(buildDuplicatePiece(color, PieceType.KNIGHT, kingSide));
        initialSquareIds.push(knightInitialSquareId(color, kingSide));
    }
    // Queen and King
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
) {
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
) {
    const occupant = board.getPieceAt(targetPosition);
    if (!occupant || occupant.color !== piece.color) {
        moves.push(targetPosition);
    }
}

/* Generate sliding moves in the given directions for a piece on the board
 * This function is used for pieces like Rooks, Bishops, and Queens that 
 * can move multiple squares in a straight line until they hit an obstacle.
 */

export function slidingMoves(
    pieceId: string, 
    board: Board,
    offsets: SquareCoordsOffset[]
): number[] {
    const moves: number[] = [];
    const piecePosition = board.getPositionOf(pieceId);
    if (!piecePosition) return moves;
    const piece = board.getPiece(pieceId)!;

    for (const offset of offsets) {
        let currentPosCoords = parseSquareCoords(piecePosition);
        while (true) {
            const translated = translateSquareCoords(currentPosCoords, offset);

            if (!translated) break;

            const newPosition = parseSquareId(
            translated.row, 
            inverseParseCol(translated.col)
            );

            if (!board.isValidSquare(newPosition)) break;
            const occupant = board.getPieceAt(newPosition);
            if (occupant) {
                if (occupant.color !== piece.color) {
                    moves.push(newPosition);
                }
                break;
            }
            moves.push(newPosition);
            currentPosCoords = translated;
        }
    }
    return moves;
};