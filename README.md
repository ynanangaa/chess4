# chess4

A four-player variant of chess, played on a 14×14 cross-shaped board by
four players (Red, Blue, Yellow, Green) taking turns in that fixed order.

This is a monorepo (npm workspaces) with two packages:

| Path | Package | What it is |
|---|---|---|
| `packages/engine` | [`@chess4/engine`](./packages/engine/README.md) | The rules engine: move generation, legality, check/checkmate/stalemate detection, scoring, draw rules. Framework-agnostic, no UI code. |
| `apps/frontend` | `@chess4/frontend` | A React + Vite + Tailwind board UI that plays a game locally in the browser using the engine. |

See each package's own README for details specific to it — this file
covers the repo as a whole.

## Prerequisites

- Node.js (a recent LTS version)
- npm (workspaces are used, so install from the repo root — not from
  inside `packages/engine` or `apps/frontend`)

## Getting started

```bash
# From the repository root
npm install
```

This installs dependencies for every workspace in one pass.

## Common commands

Run these from the **repository root**:

```bash
npm run test:engine      # Run the engine's Jest test suite
npm run build:engine     # Compile the engine's TypeScript to dist/
npm run dev:frontend      # Start the Vite dev server for the board UI
npm run build:frontend    # Production build of the frontend
```

To play a game locally, run `npm run dev:frontend` and open the printed
local URL — it starts a standard four-player game with the default
free-for-all rules and lets you click a piece, then a highlighted square,
to move.

## Project status

Both packages are under active development. Notably:

- The engine's public API (`Game`, `Board`, `RuleSet`, `Move`, etc.) is
  still being hardened/stabilized.
- `TeamRuleSet` (a placeholder for a future team-based variant) is not
  yet functionally different from the default free-for-all rules.
- En passant is intentionally not implemented for this four-player
  variant.
- Pawn promotion always promotes to a queen; there is no under-promotion
  choice yet, in the engine or the UI.
- The frontend does not yet have automated tests or a working lint setup
  (see `apps/frontend/package.json` — the ESLint config references
  packages that aren't currently declared as dependencies).
- There is no CI configured yet for this repository.

## Repository layout

```
chess4/
├── apps/
│   └── frontend/     React/Vite/Tailwind board UI
└── packages/
    └── engine/       Rules engine (@chess4/engine)
```

## License

Not yet finalized — see the note in
[`packages/engine/README.md`](./packages/engine/README.md#license).
