import { describe, expect, test } from '@jest/globals';

import {
  Color,
  parseSquareId,
  PieceType
} from '../../src';
import { buildDuplicatePiece, buildKing, buildPawn } from "../../src/utils/utils";
import { createClassicGame } from '../test-utils';

describe('getLegalMoves board isolation between candidate moves', () => {
  test(
    'does not let one candidate move leak into the legality check of another candidate for the same piece',
    () => {
      const redKing = buildKing(Color.RED);
      const yellowKing = buildKing(Color.YELLOW);
      const greenKing = buildKing(Color.GREEN);
      const blueKing = buildKing(Color.BLUE);

      // Attacks Blue's king along row 6, but is currently blocked by the
      // green pawn sitting between them.
      const redRook = buildDuplicatePiece(Color.RED, PieceType.ROOK, true);
      const blocker = buildPawn(Color.GREEN, 1);

      // The knight under test: none of its 8 candidate destinations should
      // expose Blue's king, because the blocker never actually moves away
      // in any of the resulting "real" positions (either the knight
      // captures it and takes its place on the blocking square, or the
      // knight lands off row 6 and the blocker stays put).
      const blueKnight = buildDuplicatePiece(Color.BLUE, PieceType.KNIGHT, true);

      const game = createClassicGame([
        [redKing, yellowKing, greenKing, blueKing, redRook, blocker, blueKnight],
        [
          parseSquareId(4, 4),
          parseSquareId(11, 11),
          parseSquareId(5, 12),
          parseSquareId(6, 2),
          parseSquareId(6, 10),
          parseSquareId(6, 5),
          parseSquareId(8, 6)
        ]
      ]);

      const legalMoves = game.getLegalMoves(blueKnight.id);

      // Regression guard: with a single shared, mutated board clone reused
      // across candidate moves, testing the capture on (6,5) permanently
      // removes the blocker from the shared clone, and once the knight
      // itself later moves off row 6 in that same clone, the rook's line
      // to Blue's king looks wrongly open — incorrectly disqualifying
      // every destination tested after that point.
      expect(legalMoves).toHaveLength(8);

      const expectedDestinations = [
        [6, 5], // captures the blocker, but still blocks the rook itself
        [6, 7], // still on row 6, still blocks the rook
        [7, 4],
        [7, 8],
        [9, 4],
        [9, 8],
        [10, 5],
        [10, 7]
      ].map(([row, col]) => parseSquareId(row, col));

      for (const to of expectedDestinations) {
        expect(legalMoves).toContainEqual(
          expect.objectContaining({ to })
        );
      }
    }
  );
});
