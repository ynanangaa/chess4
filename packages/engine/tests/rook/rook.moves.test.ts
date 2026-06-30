import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board/board';
import { clearBoardExcept, sortMoves } from '../test-utils';

let board: Board;

beforeEach(() => {
    board = new Board();
});

describe("Rook pseudo legal moves", () => {

    test("moves freely on an empty area", () => {

        const rook = board.setPiece("R-yellow-queenside", 90);
        clearBoardExcept(board, "R-yellow-queenside");

        expect(sortMoves(rook!.getStandardMoves(board))).toEqual(sortMoves([
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

        const rook = board.setPiece("R-yellow-queenside", 90);
        const ally = board.setPiece("R-yellow-kingside", 93);
        clearBoardExcept(board, "R-yellow-queenside", "R-yellow-kingside");

        expect(rook?.getStandardMoves(board)).not.toContainEqual({
            row: 10,
            col: "g"
        });

        expect(rook?.getStandardMoves(board)).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

    test("enemy piece can be captured", () => {

        const rook = board.setPiece("R-yellow-queenside", 90);
        const enemy = board.setPiece("blue-1", 93);
        clearBoardExcept(board, "R-yellow-queenside", "blue-1");


        expect(rook?.getStandardMoves(board)).toContainEqual({
            row: 10,
            col: "g"
        });

        expect(rook?.getStandardMoves(board)).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

});