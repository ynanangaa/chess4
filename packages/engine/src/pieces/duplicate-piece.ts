import { Piece } from "./piece";
import { Color } from "../types";
import { PieceType } from "../types";

export abstract class DuplicatePiece extends Piece {

    private kingSide : boolean;

    constructor(color: Color, type: PieceType, kingSide: boolean) {
        super(color, type);
        this.kingSide = kingSide;
        const side = this.kingSide ? "kingside": "queenside";
        this.id += "-" + side;
    }

    public getKingSide(): boolean {
        return this.kingSide;
    }
    
}