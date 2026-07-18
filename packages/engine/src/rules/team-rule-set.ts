import { Game } from "../game";
import { MoveGenerator } from "../moves";
import { DefaultRuleSet } from "./default-rule-set";

export class TeamRuleSet extends DefaultRuleSet {
  constructor(moveGenerator: MoveGenerator) {
    super(moveGenerator);
  }

  public updatePlayersScore(_game: Game): void {
    // Scoring rules are intentionally left for the four-player variant layer.
  }
}
