import type { Game } from '@chess4/engine';

interface GameOverBannerProps {
  game: Game;
}

export function GameOverBanner({ game }: GameOverBannerProps) {
  if (!game.isOver()) return null;

  const ranked = game.rankPlayersByScore();
  const topScore = ranked[0].getScore();
  const winners = ranked.filter(player => player.getScore() === topScore);
  const isTie = winners.length > 1;

  return (
    <div className="rounded border-2 border-amber-400 bg-amber-400/10 p-4 mb-4 text-center">
      <h2 className="text-lg font-bold text-amber-300">Game over</h2>
      <p className="text-slate-200 mt-1 capitalize">
        {isTie
          ? `Tied for the lead: ${winners.map(p => p.getColor()).join(', ')} — ${topScore} pts`
          : `${winners[0].getColor()} wins with ${topScore} points`}
      </p>
    </div>
  );
}