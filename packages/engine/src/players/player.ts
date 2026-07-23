import { Color, Piece } from "../types";

/**
 * Represents one of the four players in a game.
 *
 * A player has a stable application-level identifier, a fixed board color,
 * and an accumulated score.
 *
 * @remarks
 * The internal piece collection is currently not synchronized with the
 * board and no public API adds pieces to it. Consequently,
 * {@link Player.getPieces} currently returns an empty array for normal game
 * instances. To retrieve a player's pieces from the actual board state,
 * use `game.getBoard().getPiecesByColor(player.getColor())`.
 */
export class Player {
  /**
   * Reserved collection for pieces associated with this player.
   *
   * @remarks
   * This collection is currently unused and is not synchronized with
   * {@link Board}. It is retained for future player-owned-piece tracking.
   */
  private pieces = new Map<string, Piece>();

  /** The player's accumulated score. */
  private score = 0;

  /**
   * Creates a player.
   *
   * @param id - Stable application-level identifier for the player.
   * @param color - The board color assigned to the player.
   */
  constructor(
    private readonly id: string,
    private readonly color: Color
  ) {}

  /**
   * Returns the player's stable identifier.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Returns the board color controlled by this player.
   */
  public getColor(): Color {
    return this.color;
  }

  /**
   * Returns pieces stored in this player's internal piece collection.
   *
   * @remarks
   * This collection is currently unused and does not reflect the board.
   * Use `Board.getPiecesByColor` to retrieve pieces currently belonging to
   * this player on the board.
   *
   * @returns A new array containing the internally tracked pieces.
   */
  public getPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  /**
   * Returns the player's current accumulated score.
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Adds points to the player's score.
   *
   * This method accepts both positive and negative values, although normal
   * game scoring currently supplies positive values only.
   *
   * @param points - Number of points to add.
   */
  public incrementScore(points: number): void {
    this.score += points;
  }
}