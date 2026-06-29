import { describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { Pawn } from '../../src/pieces/pawn';
import { Rook } from '../../src/pieces/rook';
import { PlayerColor } from '../../src/players/player-color';
import { Position } from '../../src/position/position';
import { place } from '../tests-utils';

function sortMoves(moves: Position[]): Position[] {
    return [...moves].sort((a, b) =>
        a.row === b.row
            ? a.col.localeCompare(b.col)
            : a.row - b.row
    );
}

describe("Rook pseudo legal moves", () => {

    test("moves freely on an empty board", () => {

        const rook = place(new Rook(PlayerColor.RED, true), 7, "g");

        const board = new Board([rook]);

        expect(sortMoves(rook.getPseudoLegalMoves(board))).toEqual(sortMoves([
            { row: 1, col: "g" },
            { row: 2, col: "g" },
            { row: 3, col: "g" },
            { row: 4, col: "g" },
            { row: 5, col: "g" },
            { row: 6, col: "g" },
            { row: 8, col: "g" },
            { row: 9, col: "g" },
            { row: 10, col: "g" },
            { row: 11, col: "g" },
            { row: 12, col: "g" },
            { row: 13, col: "g" },
            { row: 14, col: "g" },

            { row: 7, col: "a" },
            { row: 7, col: "b" },
            { row: 7, col: "c" },
            { row: 7, col: "d" },
            { row: 7, col: "e" },
            { row: 7, col: "f" },
            { row: 7, col: "h" },
            { row: 7, col: "i" },
            { row: 7, col: "j" },
            { row: 7, col: "k" },
            { row: 7, col: "l" },
            { row: 7, col: "m" },
            { row: 7, col: "n" },
        ]));

    });

    test("friendly piece blocks movement", () => {

        const rook = place(new Rook(PlayerColor.RED, true), 7, "g");
        const ally = place(new Pawn(PlayerColor.RED, 1), 10, "g");

        const board = new Board([rook, ally]);

        expect(rook.getPseudoLegalMoves(board)).not.toContainEqual({
            row: 10,
            col: "g"
        });

        expect(rook.getPseudoLegalMoves(board)).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

    test("enemy piece can be captured", () => {

        const rook = place(new Rook(PlayerColor.RED, true), 7, "g");
        const enemy = place(new Pawn(PlayerColor.BLUE, 1), 10, "g");

        const board = new Board([rook, enemy]);

        expect(rook.getPseudoLegalMoves(board)).toContainEqual({
            row: 10,
            col: "g"
        });

        expect(rook.getPseudoLegalMoves(board)).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

});