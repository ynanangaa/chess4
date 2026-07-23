```markdown
# @chess4/engine

A rules engine for **four-player chess**, played on a 14×14 cross-shaped
board by four players (Red, Blue, Yellow, Green) taking turns in that
fixed order.

This package is variant-agnostic at its core: a shared `RuleSet` contract
governs move legality, check/checkmate/stalemate detection, and game-ending
conditions, while concrete rule sets implement the specifics of a given
game mode (free-for-all scoring, team play, etc.).

> 📖 **[Full API documentation](./docs/index.html)** — generated with TypeDoc from the source.

## Status

This package is under active development. The public API documented here
(`Game`, `Board`, `RuleSet`, `Move`, etc.) is being stabilized as part of
an ongoing API-hardening pass. `TeamRuleSet` is currently a placeholder
for a future team-based variant and is not yet functionally distinct from
`DefaultRuleSet`.

## Features

- Full four-player move generation for all standard piece types (pawn,
  knight, bishop, rook, queen, king), adapted to the four-way board
  geometry.
- Castling and en passant, adapted for four simultaneous opponents.
- Pawn promotion, including diagonal-capture promotions.
- Check, checkmate, and stalemate detection per player.
- Draw detection: threefold repetition, a four-player-scaled 50-move
  rule, and insufficient-material evaluation (including the king + two
  knights edge case).
- A default free-for-all scoring system: points for captures,
  multi-king checks, checkmates, and stalemates.
- Support for resigned/timed-out players, including automatic king
  shuffling to keep the game consistent until such a player is fully
  eliminated.
- An early-victory claim mechanic for decisive two-player endgames.

## Installation

```bash
npm install @chess4/engine
```

## Board geometry

The board is a 14×14 grid with the four 3×3 corners removed, forming a
cross/plus shape:

```
      Yellow
    ┌────────┐
    │        │
Blue│        │Green
    │        │
    └────────┘
      Red
```

Each player's home ranks occupy one arm of the cross. Squares are
addressed internally as flat integer ids rather than row/column pairs,
for performance; use `parseSquareCoords` / `toSquareId` from the package
to convert between the two when rendering a board.

## Quick start

```ts
import { Game, DefaultRuleSet, MoveGenerator } from "@chess4/engine";

const game = new Game(new DefaultRuleSet(new MoveGenerator()));

// Inspect legal moves for a piece.
const moves = game.getLegalMoves("red-1");

// Play a move and advance the turn.
if (moves.length > 0) {
  game.advanceTurn(moves[0]);
}

console.log(game.getCurrentPlayerColor()); // "blue"
console.log(game.getBoard().toString());
```

## Core concepts

| Class | Responsibility |
|---|---|
| `Game` | Main orchestrator and public entry point: turn progression, scoring, history, player state. |
| `Board` | Pure board state: piece placement, occupancy, cloning. Knows nothing about rules. |
| `RuleSet` | Abstract rules contract: legality, check detection, castling/en passant/promotion hooks, draw conditions. |
| `DefaultRuleSet` | Concrete free-for-all rules implementation, including scoring. |
| `TeamRuleSet` | Placeholder for a future team-based variant. |
| `MoveGenerator` | Computes raw, pseudo-legal movement patterns per piece type. |
| `Move` | A single move, from candidate generation through to recorded history. |
| `Player` / `GameState` | Player identity/score, and non-board game state (turn, status, per-player conditions). |

See the [full API documentation](./docs/index.html) for complete details
on every class and method.

## Development

```bash
npm run build   # Compile TypeScript to dist/
npm test        # Run the Jest test suite
npm run docs    # Generate TypeDoc documentation into docs/
```

## License

_TBD_
```