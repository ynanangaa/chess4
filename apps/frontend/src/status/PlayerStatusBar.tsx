import { Color as EngineColor } from '@chess4/engine';
import type { Color, Game, PlayerStatus } from '@chess4/engine';
import { GameService } from '../services/game-service';

const PLAYER_ORDER: Color[] = [
  EngineColor.RED,
  EngineColor.BLUE,
  EngineColor.YELLOW,
  EngineColor.GREEN,
];

const COLOR_CLASSES: Record<Color, string> = {
  red: 'border-red-500 text-red-400',
  blue: 'border-blue-500 text-blue-400',
  yellow: 'border-yellow-400 text-yellow-300',
  green: 'border-green-500 text-green-400',
};

function statusLabel(status: PlayerStatus): string | null {
  if (status.checkmated) return 'Checkmate';
  if (status.stalemated) return 'Stalemate';
  if (status.resigned) return 'Resigned';
  if (status.timedOut) return 'Timed out';
  if (status.inCheck) return 'Check';
  return null;
}

interface PlayerStatusBarProps {
  game: GameService;
}

export function PlayerStatusBar({ game }: PlayerStatusBarProps) {
  const currentColor = game.getCurrentPlayerColor();
  const gameOver = game.isOver();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {PLAYER_ORDER.map(color => {
        const player = game.getPlayer(color);
        const label = statusLabel(game.getPlayerStatus(color));
        const isCurrent = !gameOver && color === currentColor;

        return (
          <div
            key={color}
            className={[
              'rounded border-2 px-3 py-2 bg-slate-800/60 flex flex-col gap-1',
              COLOR_CLASSES[color],
              isCurrent
                ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white'
                : 'opacity-80',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize">{color}</span>
              <span className="text-sm text-slate-300">{player.getScore()} pts</span>
            </div>
            {label && (
              <span className="text-xs uppercase tracking-wide">{label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}