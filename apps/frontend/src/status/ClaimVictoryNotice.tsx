import { Color as EngineColor } from '@chess4/engine';
import type { Color } from '@chess4/engine';
import type { GameService } from '../services/game-service';

const PLAYER_ORDER: Color[] = [
  EngineColor.RED,
  EngineColor.BLUE,
  EngineColor.YELLOW,
  EngineColor.GREEN,
];

const TEXT_CLASSES: Record<Color, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-300',
  green: 'text-green-400',
};

interface ClaimVictoryNoticeProps {
  game: GameService;
}

/**
 * Informs a player once they're eligible to end the game immediately by
 * resigning: exactly two active players remain, and this player leads
 * by more than 20 points. Resigning at that point is safe for the
 * leader — it triggers the standard sole-survivor bonus for the
 * opponent (see `RuleSet.endGameIfSoleSurvivor`), but the +20 can never
 * close a >20-point gap, so the leader's win is guaranteed regardless.
 */
export function ClaimVictoryNotice({ game }: ClaimVictoryNoticeProps) {
  if (game.isOver()) return null;

  const activeColors = PLAYER_ORDER.filter(color => game.isPlayerActive(color));
  if (activeColors.length !== 2) return null;

  const [colorA, colorB] = activeColors;
  const scoreA = game.getPlayer(colorA).getScore();
  const scoreB = game.getPlayer(colorB).getScore();

  const [leader, trailing, lead] =
    scoreA > scoreB ? [colorA, colorB, scoreA - scoreB] : [colorB, colorA, scoreB - scoreA];

  if (lead <= 20) return null;

  return (
    <div className="rounded border border-emerald-500 bg-emerald-500/10 p-3 mb-4 text-sm">
      <p className={`font-semibold capitalize ${TEXT_CLASSES[leader]}`}>
        {leader} can claim victory
      </p>
      <p className="text-slate-300 mt-1 capitalize">
        {leader} leads {trailing} by {lead} points (more than 20).
      </p>
      <p className="text-slate-400 mt-1">
        Click the <span className="font-semibold uppercase">{leader} resign</span> button
        to end the game and claim victory now.
      </p>
    </div>
  );
}