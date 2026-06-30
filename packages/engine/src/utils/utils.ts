import { Bishop, King, Knight, Pawn, Piece, Queen, Rook } from "../pieces";
import { Square } from "../square";
import { Col, Color, Row, SquareCoords, SquareCoordsOffset } from "../types";

export function parseCol(col: number): Col {
    return String.fromCharCode(96 + col) as Col; // 96 = 97 - 1; 97 being Unicode(a)
}

export function inverseParseCol(col: Col): number {
    return col.charCodeAt(0) - 96;
}

export function parseRow(row: number): Row {
    return row as Row;
}

export function parseSquareId(row: number, col: number): number {
    return 14 * (col - 1) + row - 1;
}

export function parseSquareCoords(id: number): SquareCoords {
    return { 
        row: parseRow(id % 14 + 1), 
        col: parseCol(Math.trunc(id / 14) + 1)
    }
}

export function parseSquare(row: number, col: number, occupant?: Piece): Square {
    return {
        id: parseSquareId(row, col), 
        coords: {
            row: parseRow(row),
            col: parseCol(col),
        },
        occupant: occupant,
    }
}

export function parseSquareFrom(id: number, occupant?: Piece): Square {
    return {
        id: id,
        coords: parseSquareCoords(id),
        occupant: occupant,
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
        !!left && !!right && left.getId() === right.getId() && 
        left.getColor() === right.getColor() &&
        left.getType() === right.getType()
    );
}

export function initializePieces(color: Color): Piece[] {
    const pieces : Piece[] = [];
    // Pawns
    for (let i=1; i<=8; i++) {
        pieces.push(new Pawn(color, i))
    }
    // Duplicate Pieces : Rooks, Bishops and Knights
    for (const kingSide of [true, false]) {
        pieces.push(new Rook(color, kingSide));
        pieces.push(new Bishop(color, kingSide));
        pieces.push(new Knight(color, kingSide));
    }
    // Queen and King
    pieces.push(new Queen(color));
    pieces.push(new King(color));

    return pieces;
}

export function initializeBoardSquares(): Square[] {
    const squares: Square[] = [];

    // Initialize pieces of every color
    const allPieces = [
        ...initializePieces(Color.RED),
        ...initializePieces(Color.BLUE),
        ...initializePieces(Color.YELLOW),
        ...initializePieces(Color.GREEN)
    ];
    
    for (let row=3; row<=12; row++) {
        for (let col=4; col<=11; col++)
            squares.push(parseSquare(row, col));
    }

    for (let row=4; row<=11; row++) {
        for (const col of [3, 12])
            squares.push(parseSquare(row, col));
    }

    for (const p of allPieces) {
        squares.push(parseSquareFrom(p.getInitialSquareId(), p))
    }
    return squares;
}