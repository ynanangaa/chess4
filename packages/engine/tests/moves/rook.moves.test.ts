import { describe, expect, test } from '@jest/globals';

import { Board, buildDuplicatePiece, buildPawn, parseSquareCoords, Color, PieceType, rookMoves } from '../../src';

describe("Rook pseudo legal moves", () => {

    test("moves freely on an empty area", () => {

        const rook = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, false);
        const board = new Board([[rook], [90]]);

        const moves = rookMoves(rook, board).map(pos => parseSquareCoords(pos));
        
        // Rook at position 90 is at row 7, column g
        // Should be able to move along row 7 and column g
        expect(moves).toContainEqual({ row: 1, col: "g" });
        expect(moves).toContainEqual({ row: 14, col: "g" });
        expect(moves).toContainEqual({ row: 7, col: "a" });
        expect(moves).toContainEqual({ row: 7, col: "n" });
        
        // Verify the rook can move in multiple directions
        expect(moves.length).toBeGreaterThan(0);

    });

    test("friendly piece blocks movement", () => {

        const rook = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, false);
        const ally = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, true);
        const board = new Board([[rook, ally], [90, 93]]);

        const moves = rookMoves(rook, board).map(pos => parseSquareCoords(pos));
        expect(moves).not.toContainEqual({
            row: 10,
            col: "g"
        });

        expect(moves).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

    test("enemy piece can be captured", () => {

        const rook = buildDuplicatePiece(Color.YELLOW, PieceType.ROOK, false);
        const enemy = buildPawn(Color.BLUE, 1);
        const board = new Board([[rook, enemy], [90, 93]]);

        const moves = rookMoves(rook, board).map(pos => parseSquareCoords(pos));
        expect(moves).toContainEqual({
            row: 10,
            col: "g"
        });

        expect(moves).not.toContainEqual({
            row: 11,
            col: "g"
        });

    });

});
