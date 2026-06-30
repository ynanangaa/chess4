import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { Pawn } from '../../src/pieces';
import { Color, SquareCoords } from '../../src/types';
import { parseSquareCoords } from '../../src/utils';
import { sortMoves } from '../test-utils';

let board: Board;

beforeEach(() => {
    board = new Board();
});

describe("Pawn pseudo legal moves", () => {

    describe("Forward movement", () => {

        test.each([
            [Color.RED, 6, 113, [parseSquareCoords(114)]],
            [Color.YELLOW, 6, 82, [parseSquareCoords(81)]],
            [Color.BLUE, 6, 19, [parseSquareCoords(33)]],
            [Color.GREEN, 6, 176, [parseSquareCoords(162)]],
        ])(
            "%s pawn moves forward",
            (color, pawnNum, expectedSquareId, expectedMoves) => {

                const pawn = new Pawn(color, pawnNum);

                expect(pawn.getInitialSquareId()).toEqual(expectedSquareId);

                const board2 = new Board([pawn]);

                expect(sortMoves(pawn.getStandardMoves(board2)))
                    .toEqual(sortMoves(expectedMoves));
            }
        );

    });

    describe("Blocked forward movement", () => {

        test("cannot move if a piece blocks the square ahead", () => {

            const pawn = board.setPiece("red-6", 75);
            const blocker = board.setPiece("R-red-kingside", 76);

            expect(pawn?.getStandardMoves(board)).toEqual([]);

        });

    });

    describe("Captures", () => {

        test("captures diagonally left", () => {

            const pawn = board.setPiece("red-6", 75);
            const enemy = board.setPiece("R-yellow-kingside", 90);

            expect(sortMoves(pawn!.getStandardMoves(board))).toEqual(
                sortMoves([
                    { row: 7, col: "f" },
                    { row: 7, col: "g" }
                ])
            );

        });

        test("captures diagonally right", () => {

            const pawn = board.setPiece("red-6", 75);
            const enemy = board.setPiece("R-yellow-kingside", 62);

            expect(sortMoves(pawn!.getStandardMoves(board))).toEqual(
                sortMoves([
                    { row: 7, col: "e" },
                    { row: 7, col: "f" }
                ])
            );

        });

        test("cannot capture friendly piece", () => {

            const pawn = board.setPiece("red-6", 75);
            const ally = board.setPiece("R-red-kingside", 90);

            expect(pawn?.getStandardMoves(board)).toEqual([
                { row: 7, col: "f" }
            ]);

        });

        test("cannot capture forward", () => {

            const pawn = board.setPiece("yellow-6", 75);
            const enemy = board.setPiece("R-blue-kingside", 74);

            expect(pawn?.getStandardMoves(board)).toEqual([]);

        });

    });

    describe("Board limits", () => {

        test("never generates positions outside the board", () => {

            const pawn = board.setPiece("green-6", 6);

            expect(pawn?.getStandardMoves(board)).toEqual([]);

        });

    });

});