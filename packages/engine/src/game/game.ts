import { Board, BoardSetup } from "../board";
import { ReadonlyBoard } from "../board/board";
import { Move } from "../moves";
import { Player } from "../players";
import { RuleSet } from "../rules";
import { CapturedPiece, Color, GameStatus, PlayerStatus } from "../types";
import { GameState } from "./game-state";

const NEXT_PLAYER_COLOR = new Map<Color, Color>([
  [Color.RED, Color.BLUE],
  [Color.BLUE, Color.YELLOW],
  [Color.YELLOW, Color.GREEN],
  [Color.GREEN, Color.RED]
]);

/**
 * A read-only view of a {@link Player}: identity and score, but no
 * access to {@link Player.incrementScore} or any other mutating method
 * `Player` might gain in the future.
 *
 * Returned by {@link Game.getPlayer} and {@link Game.rankPlayersByScore}
 * instead of the live `Player` instance, for the same reason
 * {@link Game.getBoard} never hands out a real `Board`: a `Player`
 * obtained from outside the engine must never be usable to award oneself
 * points directly (e.g. `game.getPlayer(color).incrementScore(9999)`),
 * bypassing every scoring rule in {@link RuleSet}.
 */
export interface ReadonlyPlayer {
  getId(): string;
  getColor(): Color;
  getScore(): number;
}

function toReadonlyPlayer(player: Player): ReadonlyPlayer {
  return {
    getId: () => player.getId(),
    getColor: () => player.getColor(),
    getScore: () => player.getScore(),
  };
}

/**
 * Registry mapping each {@link Game} to its real, mutable {@link Board}.
 *
 * Exists so {@link RuleSet} — the one component trusted to mutate board
 * state directly — can obtain the live `Board` without ever going
 * through {@link Game.getBoard}, which intentionally returns a hardened,
 * mutation-free view. This map itself is a module-scope closure
 * variable: it is never exported, so nothing outside this file can read
 * it directly.
 */
const mutableBoards = new WeakMap<Game, Board>();

/**
 * @internal
 * Returns the real, mutable {@link Board} backing `game`.
 *
 * Deliberately bypasses {@link Game.getBoard}'s hardened view. Exported
 * from this module (and re-exported by `game/index.ts` for other
 * engine-internal code to import), but **not** re-exported from the
 * package's public entry point (`src/index.ts`), so it is unreachable
 * from outside `@chess4/engine`.
 */
export function getMutableBoard(game: Game): Board {
  return mutableBoards.get(game)!;
}

/**
 * The privileged, mutation-capable surface onto a {@link Game}'s
 * internal bookkeeping — move history, moved-piece tracking, captured
 * pieces, the move clock, position-repetition counts, player scores,
 * turn order, and per-player status flags.
 *
 * Every one of these was previously a plain public method directly on
 * `Game`; none of them has any legitimate caller other than
 * {@link RuleSet} carrying out its own bookkeeping. Moving them behind
 * this registry (mirroring {@link getMutableBoard}) means none of them
 * are reachable from outside the engine at all — not merely discouraged
 * by convention, but structurally absent from `Game`'s public class.
 */
export interface MutableGameInternals {
  addMoveToHistory(move: Move): void;
  addMovedPiece(id: string): void;
  addCapturedPiece(id: string, captured: CapturedPiece): void;
  incrementMoveClock(): void;
  resetMoveClock(): void;
  incrementPositionCount(positionKey: string): void;
  incrementPlayerScore(color: Color, points: number): void;
  advanceCurrentPlayer(): void;
  setGameStatus(status: GameStatus): void;
  setPlayerInCheck(color: Color, inCheck: boolean): void;
  setPlayerCheckmated(color: Color): void;
  setPlayerStalemated(color: Color): void;
  setPlayerResigned(color: Color): void;
  setPlayerTimedOut(color: Color): void;
}

/** See {@link mutableBoards} — same pattern, for bookkeeping instead of the board. */
const mutableGameInternals = new WeakMap<Game, MutableGameInternals>();

/**
 * @internal
 * Returns the privileged mutation surface for `game`'s internal
 * bookkeeping. See {@link MutableGameInternals} and {@link getMutableBoard}.
 */
export function getMutableGameInternals(game: Game): MutableGameInternals {
  return mutableGameInternals.get(game)!;
}

/**
 * Main public API and stateful orchestrator for a four-player chess game.
 *
 * `Game` owns the board, move history, per-player scores, and per-player
 * status, and delegates all rules decisions (legality, check detection,
 * scoring, draw/endgame conditions) to the {@link RuleSet} it was built
 * with. Each player's status is exposed as an independent set of boolean
 * flags (see {@link PlayerStatus}: `inCheck`, `checkmated`, `stalemated`,
 * `resigned`, `timedOut`) rather than a single exclusive state, since
 * these conditions can coexist (e.g. a resigned player's abandoned
 * position may later be found checkmated).
 *
 * ### Trust boundary
 * Every method that actually mutates game state either lives here as a
 * thin delegation to {@link RuleSet} ({@link Game.applyMove},
 * {@link Game.advanceTurn}, {@link Game.claimVictory},
 * {@link Game.resignPlayer}, {@link Game.timeOutPlayer} — the sanctioned
 * player-facing actions), or has been removed from this class entirely
 * in favor of {@link getMutableBoard} / {@link getMutableGameInternals},
 * two module-private registries that hand out real mutation access only
 * to code that imports them directly from inside `@chess4/engine` (in
 * practice, only `RuleSet`). Neither is re-exported from the package's
 * public entry point, so external code holding a `Game` obtained through
 * the normal public API — including a browser console — has no path to
 * either registry, and can only ever read state or invoke the sanctioned
 * actions above.
 */
export class Game {
  #board: Board;
  #gameState: GameState;
  #ruleSet: RuleSet;
  #history: Move[];
  #movedPieces = new Set<string>();
  #players: Player[];
  #capturedPieces = new Map<string, CapturedPiece>();
  #positionCounts = new Map<string, number>();
  #currentPositionKey: string;

  /**
   * Creates a game.
   *
   * @param ruleSet - The rules engine governing this game variant.
   * @param initialPieces - Optional board setup (see {@link BoardSetup}).
   * Omit this argument to use the standard four-player starting setup.
   * @param history - Optional initial move history. Copied but not
   * replayed; see prior remarks on this parameter's limited scope.
   */
  constructor(
    ruleSet: RuleSet,
    initialPieces?: BoardSetup,
    history?: Move[]
  ) {
    this.#ruleSet = ruleSet;
    this.#board = new Board(initialPieces);
    this.#history = history ? history.slice() : [];
    this.#players = [
      new Player("P1", Color.RED),
      new Player("P2", Color.BLUE),
      new Player("P3", Color.YELLOW),
      new Player("P4", Color.GREEN)
    ];
    this.#gameState = new GameState();

    // Registries must be populated before anything (including the
    // computePositionKey call below, via getCastleMoves) might need
    // getMutableBoard/getMutableGameInternals for this instance.
    mutableBoards.set(this, this.#board);
    mutableGameInternals.set(this, {
      addMoveToHistory: (move) => { this.#history.push(move); },
      addMovedPiece: (id) => { this.#movedPieces.add(id); },
      addCapturedPiece: (id, captured) => { this.#capturedPieces.set(id, captured); },
      incrementMoveClock: () => { this.#gameState.incrementMoveClock(); },
      resetMoveClock: () => { this.#gameState.resetMoveClock(); },
      incrementPositionCount: (positionKey) => {
        this.#currentPositionKey = positionKey;
        const n = this.#positionCounts.get(positionKey) ?? 0;
        this.#positionCounts.set(positionKey, n + 1);
      },
      incrementPlayerScore: (color, points) => {
        const playerIndex = this.#players.findIndex(p => p.getColor() === color);
        this.#players[playerIndex].incrementScore(points);
      },
      advanceCurrentPlayer: () => {
        this.#gameState.setCurrentPlayerColor(
          this.getNextPlayerColor(this.getCurrentPlayerColor())
        );
      },
      setGameStatus: (status) => { this.#gameState.setStatus(status); },
      setPlayerInCheck: (color, inCheck) => {
        this.#gameState.updatePlayerStatus(color, { inCheck });
      },
      setPlayerCheckmated: (color) => {
        this.#gameState.updatePlayerStatus(color, { checkmated: true });
      },
      setPlayerStalemated: (color) => {
        this.#gameState.updatePlayerStatus(color, { stalemated: true });
      },
      setPlayerResigned: (color) => {
        this.#gameState.updatePlayerStatus(color, { resigned: true });
      },
      setPlayerTimedOut: (color) => {
        this.#gameState.updatePlayerStatus(color, { timedOut: true });
      },
    });

    this.#currentPositionKey = this.#ruleSet.computePositionKey(this);
  }

  public destroy(): void {
    this.#history.length = 0;
    this.#movedPieces.clear();
  }

  public applyMove(move: Move): boolean {
    return this.#ruleSet.applyMove(move, this);
  }

  public advanceTurn(move?: Move): boolean {
    return this.#ruleSet.advanceTurn(this, move);
  }

  public claimVictory(player: Color): boolean {
    return this.#ruleSet.claimVictory(player, this);
  }

  /**
   * Marks a player as resigned. All of their pieces except the king are
   * deactivated; the king remains active for the ruleset's
   * resigned-player auto-play handling.
   */
  public resignPlayer(color: Color): void {
    this.#ruleSet.resignPlayer(color, this);
  }

  /**
   * Marks a player as timed out. Mirrors {@link Game.resignPlayer} for
   * the timeout forfeit case.
   */
  public timeOutPlayer(color: Color): void {
    this.#ruleSet.timeOutPlayer(color, this);
  }

  /**
   * Returns the current position as a read-only view.
   *
   * @remarks
   * This never exposes a mutable `Board` — mutating board state outside
   * of {@link Game.advanceTurn}/{@link Game.applyMove} would bypass turn
   * validation, move history, scoring, check state, and other ruleset
   * bookkeeping. The active {@link RuleSet} is the only code permitted
   * to mutate the underlying board directly.
   */
  public getBoard(): ReadonlyBoard {
    const b = this.#board;
    return {
      getConfig: () => b.getConfig(),
      getOccupiedSquares: () => b.getOccupiedSquares(),
      getOccupiedSquaresByColor: (c) => b.getOccupiedSquaresByColor(c),
      getPiece: (id) => b.getPiece(id),
      getPieceAt: (id) => b.getPieceAt(id),
      getPiecesByColor: (c) => b.getPiecesByColor(c),
      getSquareOf: (id) => b.getSquareOf(id),
      getKingSquare: (c) => b.getKingSquare(c),
      isOccupied: (id) => b.isOccupied(id),
      isValidSquare: (id) => b.isValidSquare(id),
      isPieceActive: (id) => b.isPieceActive(id),
      exportPieces: () => b.exportPieces(),
      toString: () => b.toString(),
    };
  }

  /**
   * Returns every piece captured so far in the game.
   *
   * The returned array is a copy; mutating it does not affect this game.
   */
  public getAllCapturedPieces(): CapturedPiece[] {
    return Array.from(this.#capturedPieces.values());
  }

  public getCapturedPiece(id: string): CapturedPiece | undefined {
    return this.#capturedPieces.get(id);
  }

  public getGameState(): GameState {
    return this.#gameState;
  }

  public getHistory(): Move[] {
    return this.#history.slice();
  }

  public getCurrentPlayerColor(): Color {
    return this.#gameState.getCurrentPlayerColor();
  }

  /**
   * Returns a read-only view of a player: identity and score only —
   * never the live {@link Player} instance. See {@link ReadonlyPlayer}.
   */
  public getPlayer(color: Color): ReadonlyPlayer {
    const player = this.#players.find(p => p.getColor() === color);

    if (!player) {
      throw new Error(`Unknown player ${color}`);
    }

    return toReadonlyPlayer(player);
  }

  /**
   * Returns a player's current status flags (check, checkmate,
   * stalemate, resignation, timeout).
   *
   * @param color - The player color to inspect.
   */
  public getPlayerStatus(color: Color): PlayerStatus {
    return this.#gameState.getPlayerStatus(color);
  }

  public getCurrentPositionCount(): number {
    return this.#positionCounts.get(this.#currentPositionKey) ?? 0;
  }

  public getLegalMoves(pieceId: string): Move[] {
    return this.#ruleSet.getLegalMoves(pieceId, this);
  }

  public getMoveClock(): number {
    return this.#gameState.getMoveClock();
  }

  public hasPieceMoved(pieceId: string): boolean {
    return this.#movedPieces.has(pieceId);
  }

  public isOver(): boolean {
    return this.#gameState.getStatus() === GameStatus.OVER;
  }

  /**
   * Checks whether a player is currently active in the game — i.e. not
   * checkmated, not stalemated, and not resigned/timed-out. Being in
   * check does not, by itself, make a player inactive.
   */
  public isPlayerActive(color: Color): boolean {
    const status = this.#gameState.getPlayerStatus(color);

    return (!status.checkmated && !status.stalemated
      && !status.resigned && !status.timedOut
    );
  }

  /** Checks whether a player's king is currently in check. */
  public isPlayerInCheck(color: Color): boolean {
    return this.#gameState.getPlayerStatus(color).inCheck;
  }

  /** Checks whether a player has been checkmated. */
  public isPlayerCheckMated(color: Color): boolean {
    return this.#gameState.getPlayerStatus(color).checkmated;
  }

  /** Checks whether a player has been stalemated. */
  public isPlayerStalled(color: Color): boolean {
    return this.#gameState.getPlayerStatus(color).stalemated;
  }

  /** Checks whether a player has resigned or timed out. */
  public isPlayerResignedOrTimedOut(color: Color): boolean {
    const status = this.#gameState.getPlayerStatus(color);

    return status.resigned || status.timedOut;
  }

  public getNextPlayerColor(previous: Color): Color {
    return NEXT_PLAYER_COLOR.get(previous)!;
  }

  public rankPlayersByScore(): ReadonlyPlayer[] {
    return [...this.#players]
      .sort((a, b) => b.getScore() - a.getScore())
      .map(toReadonlyPlayer);
  }
}