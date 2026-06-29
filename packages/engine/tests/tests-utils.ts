import { Piece } from "../src/pieces/piece";

export function place<T extends Piece>(
    piece: T,
    row: number,
    col: string
): T {
    piece.setPosition({ row, col });
    return piece;
}