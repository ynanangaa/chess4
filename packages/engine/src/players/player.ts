import { Piece } from "../pieces";
import { Color } from "../types";

export class Player {
  private readonly id: string;
  private readonly color: Color;
  private pieces: Map<string, Piece>= new Map();
  private score: number;
  // Status: "active" if the player is still in the game, "inactive" if checkmated, stalemated, or resigned
  private status: "active" | "inactive";

  constructor(id: string, color: Color) {
    this.id = id;
    this.color = color;
    this.score = 0;
    this.status = "active";
  }

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

  public getStatus(): "active" | "inactive" {
    return this.status;
  }

  public incrementScore(points: number): void {
    this.score += points;
  }
  
  public setStatus(status: "active" | "inactive"): void {
    this.status = status;
  }
}
