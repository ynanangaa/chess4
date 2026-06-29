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

describe("Pawn pseudo legal moves", () => {

    describe("Forward movement", () => {

        test.each([
            [PlayerColor.RED, 6, { row: 2, col: "i" }, [{ row: 3, col: "i" }]],
            [PlayerColor.YELLOW, 6, { row: 13, col: "f" }, [{ row: 12, col: "f" }]],
            [PlayerColor.BLUE, 6, { row: 6, col: "b" }, [{ row: 6, col: "c" }]],
            [PlayerColor.GREEN, 6, { row: 9, col: "m" }, [{ row: 9, col: "l" }]],
        ])(
            "%s pawn moves forward",
            (color, pawnNum, expectedPosition, expectedMoves) => {

                const pawn = new Pawn(color, pawnNum);

                expect(pawn.getPosition()).toEqual(expectedPosition);

                const board = new Board([pawn]);

                expect(sortMoves(pawn.getPseudoLegalMoves(board)))
                    .toEqual(sortMoves(expectedMoves));
            }
        );

    });

    describe("Blocked forward movement", () => {

        test("cannot move if a piece blocks the square ahead", () => {

            const pawn = place(new Pawn(PlayerColor.RED, 6), 6, "f");
            const blocker = place(new Rook(PlayerColor.RED, true), 7, "f");

            const board = new Board([pawn, blocker]);

            expect(pawn.getPseudoLegalMoves(board)).toEqual([]);

        });

    });

    describe("Captures", () => {

        test("captures diagonally left", () => {

            const pawn = place(new Pawn(PlayerColor.BLUE, 6), 6, "f");
            const enemy = place(new Rook(PlayerColor.YELLOW, true), 7, "g");

            const board = new Board([pawn, enemy]);

            expect(sortMoves(pawn.getPseudoLegalMoves(board))).toEqual(
                sortMoves([
                    { row: 6, col: "g" },
                    { row: 7, col: "g" }
                ])
            );

        });

        test("captures diagonally right", () => {

            const pawn = place(new Pawn(PlayerColor.GREEN, 6), 6, "f");
            const enemy = place(new Rook(PlayerColor.YELLOW, true), 7, "e");

            const board = new Board([pawn, enemy]);

            expect(sortMoves(pawn.getPseudoLegalMoves(board))).toEqual(
                sortMoves([
                    { row: 6, col: "e" },
                    { row: 7, col: "e" }
                ])
            );

        });

        test("cannot capture friendly piece", () => {

            const pawn = place(new Pawn(PlayerColor.RED, 6), 6, "f");
            const ally = place(new Rook(PlayerColor.RED, true), 7, "g");

            const board = new Board([pawn, ally]);

            expect(pawn.getPseudoLegalMoves(board)).toEqual([
                { row: 7, col: "f" }
            ]);

        });

        test("cannot capture forward", () => {

            const pawn = place(new Pawn(PlayerColor.YELLOW, 6), 6, "f");
            const enemy = place(new Rook(PlayerColor.BLUE, true), 5, "f");

            const board = new Board([pawn, enemy]);

            expect(pawn.getPseudoLegalMoves(board)).toEqual([]);

        });

    });

    describe("Board limits", () => {

        test("never generates positions outside the board", () => {

            const pawn = place(new Pawn(PlayerColor.GREEN, 6), 7, "a");

            const board = new Board([pawn]);

            expect(pawn.getPseudoLegalMoves(board)).toEqual([]);

        });

    });

});