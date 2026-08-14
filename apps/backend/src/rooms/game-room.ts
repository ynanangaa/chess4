import { Color, DefaultRuleSet, Game, MoveGenerator, RuleSet } from '@chess4/engine';

const PLAYER_ORDER: Color[] = [Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN];

/**
 * One in-memory game session: a single {@link Game} instance plus the
 * color-seat assignments of whoever has joined it.
 */
export class GameRoom {
  private readonly game: Game;
  private readonly seats = new Map<Color, boolean>(
    PLAYER_ORDER.map(color => [color, false])
  );

  /**
   * Whether every seat has been filled at least once. Once `true`, it
   * never reverts — see {@link GameRoom.handleDisconnect}, which changes
   * meaning entirely based on this flag.
   */
  private started = false;

  constructor(
    public readonly code: string,
    ruleSet: RuleSet = new DefaultRuleSet(new MoveGenerator())
  ) {
    this.game = new Game(ruleSet);
  }

  public getGame(): Game {
    return this.game;
  }

  /**
   * Assigns the next free seat, in canonical color order. Marks the
   * room as started the moment this fills the fourth and final seat.
   *
   * @returns The assigned color, or `undefined` if every seat is taken.
   */
  public assignSeat(): Color | undefined {
    for (const color of PLAYER_ORDER) {
      if (!this.seats.get(color)) {
        this.seats.set(color, true);
        if (this.isFull()) this.started = true;
        return color;
      }
    }

    return undefined;
  }

  /** Frees a previously assigned seat, allowing it to be reassigned. */
  public releaseSeat(color: Color): void {
    this.seats.set(color, false);
  }

  public isSeatTaken(color: Color): boolean {
    return this.seats.get(color) ?? false;
  }

  public isFull(): boolean {
    return PLAYER_ORDER.every(color => this.seats.get(color));
  }

  public hasStarted(): boolean {
    return this.started;
  }

  /** Returns every color currently occupied by a connected player,
   * in canonical order. */
  public getOccupiedSeats(): Color[] {
    return PLAYER_ORDER.filter(color => this.seats.get(color));
  }

  /**
   * Handles the loss of `color`'s connection.
   *
   * - Before the game has started, the seat is simply released — a new
   *   joiner can take that color.
   * - Once the game has started, `color` is instead resigned in the
   *   underlying {@link Game} (see `Game.resignPlayer`), and the seat
   *   remains permanently theirs: nobody else can join as a resigned
   *   color mid-game, since the engine's own auto-play/freeze handling
   *   now governs whatever's left of that color's pieces.
   *
   * No-op if `color` is already inactive (e.g. a second disconnect
   * event for an already-resigned player, or a player who was already
   * eliminated by checkmate/stalemate before disconnecting).
   */
  public handleDisconnect(color: Color): void {
    if (!this.started) {
      this.releaseSeat(color);
      return;
    }

    if (!this.game.isPlayerActive(color)) return;

    this.game.resignPlayer(color);
  }
}