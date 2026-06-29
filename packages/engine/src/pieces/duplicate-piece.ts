import { Piece } from "./piece";
import { PlayerColor } from "../players/player-color";
import { PieceType } from "./piece-type";
import { Position } from "../position/position";

export abstract class DuplicatePiece extends Piece {

    private kingSide : boolean;

    constructor(color: PlayerColor, type: PieceType, kingSide: boolean) {
        super(color, type);
        this.kingSide = kingSide;
        const side = this.kingSide ? "kingside": "queenside";
        this.id += "-" + side;
    }

    public getKingSide(): boolean {
        return this.kingSide;
    }
    
}