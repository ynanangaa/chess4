import { Color, Piece } from "../types";

export type PlayerStatus = "active" | "inactive";

export class Player {
  private pieces = new Map<string, Piece>();
  private score = 0;
  private status: PlayerStatus = "active";

  constructor(
    private readonly id: string,
    private readonly color: Color
  ) {}

  public getId(): string {
    return this.id;
  }

  public getColor(): Color {
    return this.color;
  }

  public getPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  public getScore(): number {
    return this.score;
  }

  public getStatus(): PlayerStatus {
    return this.status;
  }

  public incrementScore(points: number): void {
    this.score += points;
  }

  public setStatus(status: PlayerStatus): void {
    this.status = status;
  }
}
