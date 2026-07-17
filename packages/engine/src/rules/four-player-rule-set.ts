import { ClassicRuleSet } from "./classic-rule-set";
import { Player } from "../players/player";
import { MoveGenerator } from "../moves";
import { Game } from "../game";

export class FourPlayerRuleSet extends ClassicRuleSet {

    constructor(moveGenerator: MoveGenerator) {
        super(moveGenerator);
    }

    public updatePlayersScore(game: Game): void {
        
    }

}