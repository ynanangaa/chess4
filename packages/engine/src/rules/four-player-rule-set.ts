import { Game } from "../game";
import { MoveGenerator } from "../moves";
import { ClassicRuleSet } from "./classic-rule-set";

export class FourPlayerRuleSet extends ClassicRuleSet {
  constructor(moveGenerator: MoveGenerator) {
    super(moveGenerator);
  }

  public updatePlayersScore(_game: Game): void {
    // Scoring rules are intentionally left for the four-player variant layer.
  }
}
