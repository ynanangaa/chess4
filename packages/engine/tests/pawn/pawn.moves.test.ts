import { beforeEach, describe, expect, test } from '@jest/globals';

import { Board } from '../../src/board';
import { buildPawn, buildDuplicatePiece, parseSquareCoords } from '../../src/utils';
import { Color, SquareCoords, PieceType } from '../../src/types';
import { pawnMoves } from '../../src/moves/pawn-moves';
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

                const pawn = buildPawn(color, pawnNum);
                board = new Board([[pawn], [expectedSquareId]]);

                const moves = pawnMoves(pawn, expectedSquareId, board).map(pos => parseSquareCoords(pos));
                expect(sortMoves(moves))
                    .toEqual(sortMoves(expectedMoves));
            }
        );

    });

    describe("Blocked forward movement", () => {

        test("cannot move if a piece blocks the square ahead", () => {

            const pawn = buildPawn(Color.RED, 6);
            const blocker = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
            board = new Board([[pawn, blocker], [75, 76]]);

            const moves = pawnMoves(pawn, 75, board).map(pos => parseSquareCoords(pos));
            expect(moves).toEqual([]);

        });

    });

    describe("Captures", () => {

        test("captures diagonally left", () => {

            const pawn = buildPawn(Color.RED, 6);
            const enemy = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, true);
            board = new Board([[pawn, enemy], [75, 90]]);

            const moves = pawnMoves(pawn, 75, board).map(pos => parseSquareCoords(pos));
            expect(sortMoves(moves)).toEqual(
                sortMoves([
                    { row: 7, col: "f" },
                    { row: 7, col: "g" }
                ])
            );

        });

        test("captures diagonally right", () => {

            const pawn = buildPawn(Color.RED, 6);
            const enemy = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, true);
            board = new Board([[pawn, enemy], [75, 62]]);

            const moves = pawnMoves(pawn, 75, board).map(pos => parseSquareCoords(pos));
            expect(sortMoves(moves)).toEqual(
                sortMoves([
                    { row: 7, col: "e" },
                    { row: 7, col: "f" }
                ])
            );

        });

        test("cannot capture friendly piece", () => {

            const pawn = buildPawn(Color.RED, 6);
            const ally = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
            board = new Board([[pawn, ally], [75, 90]]);

            const moves = pawnMoves(pawn, 75, board).map(pos => parseSquareCoords(pos));
            expect(moves).toEqual([
                { row: 7, col: "f" }
            ]);

        });

        test("cannot capture forward", () => {

            const pawn = buildPawn(Color.YELLOW, 6);
            const enemy = buildDuplicatePiece(Color.BLUE, PieceType.ROOK, true);
            board = new Board([[pawn, enemy], [75, 74]]);

            const moves = pawnMoves(pawn, 75, board).map(pos => parseSquareCoords(pos));
            expect(moves).toEqual([]);

        });

    });

    describe("Board limits", () => {

        test("never generates positions outside the board", () => {

            const pawn = buildPawn(Color.GREEN, 6);
            board = new Board([[pawn], [6]]);

            const moves = pawnMoves(pawn, 6, board).map(pos => parseSquareCoords(pos));
            expect(moves).toEqual([]);

        });

    });

});