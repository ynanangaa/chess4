import { Game } from "../game";
import { MoveGenerator } from "../moves";
import { DefaultRuleSet } from "./default-rule-set";

/**
 * Placeholder rules engine intended for a future team-based four-player
 * variant (e.g. RED+YELLOW vs BLUE+GREEN), where teammates share a win
 * condition rather than competing individually.
 *
 * @remarks
 * This class currently extends `DefaultRuleSet` and therefore inherits
 * its complete free-for-all scoring and mate-handling behavior
 * (individual checkmate bonuses, stalemate bonuses, insufficient-material
 * evaluation, etc.) unchanged. None of that behavior has yet been
 * adapted for team play. Team-specific rules — shared scoring, shared
 * elimination/victory conditions, and any friendly-fire restrictions —
 * are expected to be introduced in a later pass, likely alongside a
 * reconsideration of whether this class should instead extend `RuleSet`
 * directly rather than `DefaultRuleSet`.
 */
export class TeamRuleSet extends DefaultRuleSet {
  /**
   * @param moveGenerator - Strategy responsible for generating pseudo-legal
   * destination squares for a given piece.
   */
  constructor(moveGenerator: MoveGenerator) {
    super(moveGenerator);
  }
}