import { Color, Piece } from "../types";

export class Player {
  private pieces = new Map<string, Piece>();
  private score = 0;

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

  public incrementScore(points: number): void {
    this.score += points;
  }
}
