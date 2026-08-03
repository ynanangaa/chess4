//import type { Game } from '@chess4/engine';
import { GameService } from '../services/game-service';

interface ScorePanelProps {
  game: GameService;
}

const COLOR_DOT_CLASSES: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
};

export function ScorePanel({ game }: ScorePanelProps) {
  const ranked = game.rankPlayersByScore();

  return (
    <div className="rounded border border-slate-700 bg-slate-800/60 p-3 mb-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-2">Standings</h2>
      <ol className="space-y-1">
        {ranked.map((player, index) => (
          <li key={player.getId()} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="text-slate-500 w-4">{index + 1}.</span>
              <span
                className={[
                  'inline-block w-2.5 h-2.5 rounded-full',
                  COLOR_DOT_CLASSES[player.getColor()],
                ].join(' ')}
              />
              <span className="capitalize">{player.getColor()}</span>
            </span>
            <span className="font-mono">{player.getScore()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}