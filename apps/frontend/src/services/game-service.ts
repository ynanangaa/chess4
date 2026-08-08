import {
  Game,
  DefaultRuleSet,
  MoveGenerator,
  type Move,
  type Color,
} from '@chess4/engine';

function createGame(): Game {
  return new Game(new DefaultRuleSet(new MoveGenerator()));
}

/**
 * Module-private, singleton `Game` instance.
 *
 * Deliberately not exported, and deliberately not held in React state:
 * a `Game` sitting in `useState` is directly reachable via React
 * DevTools' component inspector (and its `$r` console shortcut) with no
 * debugger required. A plain module-scope variable never appears in the
 * component tree at all, closing that specific path.
 *
 * This remains a *local* hardening measure only — a debugger attached
 * via the Sources panel can still reach live engine internals regardless
 * of where the reference lives, since a paused breakpoint exposes every
 * value flowing through the call stack, private fields included. The
 * real fix for that class of attacker is a server holding the canonical
 * `Game` instance; this module is deliberately structured so swapping in
 * a networked backend later only requires changing this file's
 * internals — every caller only ever depends on `gameService`'s shape,
 * never on `Game` itself.
 */
let game = createGame();

/**
 * Monotonically increasing version, bumped on every mutation performed
 * through this service. Exists purely so React components can detect
 * that `game` — an opaque, mutable class instance React has no way to
 * diff on its own — has changed, via `useSyncExternalStore` (see
 * `useGameService`). Its numeric value is never meant to be read; only
 * its identity across renders matters.
 */
let version = 0;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/**
 * Frontend-facing facade over the engine's `Game`.
 *
 * Components depend only on this object's shape — never on `Game`
 * directly — so that:
 * - the singleton instance itself never needs to be passed through
 *   props/state/context;
 * - every mutating action can uniformly call `notify()`, so any
 *   component subscribed via `useGameService` re-renders exactly when
 *   something actually changed, with no manual `forceRender` calls
 *   scattered through UI code.
 */
export const gameService = {
  // ── React integration ────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): number {
    return version;
  },

  // ── Mutating actions ──────────────────────────────────────────────

  advanceTurn(move?: Move): boolean {
    const applied = game.advanceTurn(move);
    if (applied) notify();
    return applied;
  },

  claimVictory(player: Color): boolean {
    const claimed = game.claimVictory(player);
    if (claimed) notify();
    return claimed;
  },

  resignPlayer(color: Color): void {
    if (game.isOver() || !game.isPlayerActive(color)) return;

    const wasCurrentPlayer = game.getCurrentPlayerColor() === color;

    game.resignPlayer(color);

    if (wasCurrentPlayer) {
      // Resigning doesn't itself advance the turn (see RuleSet.resignPlayer).
      // If the resigning player was the one currently up, hand control back
      // to the engine's normal turn-resolution logic — the same path that
      // already correctly auto-plays a random king move if one exists, or
      // freezes the king and passes the turn on if not (see
      // RuleSet.advanceTurn / autoPlayOrSkip / settleUpcomingTurns).
      game.advanceTurn();
    }

    notify();
  },

  timeOutPlayer(color: Color): void {
    if (game.isOver() || !game.isPlayerActive(color)) return;

    const wasCurrentPlayer = game.getCurrentPlayerColor() === color;

    game.timeOutPlayer(color);

    if (wasCurrentPlayer) {
      game.advanceTurn();
    }

    notify();
  },

  /** Discards the current game and starts a fresh one. */
  startNewGame(): void {
    game = createGame();
    notify();
  },

  // ── Read-only queries (thin pass-throughs) ─────────────────────────

  getBoard() {
    return game.getBoard();
  },
  getAllCapturedPieces() {
    return game.getAllCapturedPieces();
  },
  getCapturedPiece(id: string) {
    return game.getCapturedPiece(id);
  },
  getHistory() {
    return game.getHistory();
  },
  getCurrentPlayerColor() {
    return game.getCurrentPlayerColor();
  },
  getPlayer(color: Color) {
    return game.getPlayer(color);
  },
  getPlayerStatus(color: Color) {
    return game.getPlayerStatus(color);
  },
  getCurrentPositionCount() {
    return game.getCurrentPositionCount();
  },
  getLegalMoves(pieceId: string) {
    return game.getLegalMoves(pieceId);
  },
  getMoveClock() {
    return game.getMoveClock();
  },
  hasPieceMoved(pieceId: string) {
    return game.hasPieceMoved(pieceId);
  },
  isOver() {
    return game.isOver();
  },
  isPlayerActive(color: Color) {
    return game.isPlayerActive(color);
  },
  isPlayerInCheck(color: Color) {
    return game.isPlayerInCheck(color);
  },
  isPlayerCheckMated(color: Color) {
    return game.isPlayerCheckMated(color);
  },
  isPlayerStalled(color: Color) {
    return game.isPlayerStalled(color);
  },
  isPlayerResignedOrTimedOut(color: Color) {
    return game.isPlayerResignedOrTimedOut(color);
  },
  getNextPlayerColor(previous: Color) {
    return game.getNextPlayerColor(previous);
  },
  getNextActivePlayerColor(previous: Color) {
    return game.getNextActivePlayerColor(previous);
  },
  rankPlayersByScore() {
    return game.rankPlayersByScore();
  },
} as const;

/** The shape of {@link gameService} — used to type component props. */
export type GameService = typeof gameService;