import { gameService } from '../services/game-service';

export function NewGameButton() {
  function handleClick(): void {
    const confirmed = window.confirm(
      'Start a new game? The current game will be lost.'
    );
    if (confirmed) gameService.startNewGame();
  }

  return (
    <button
      onClick={handleClick}
      className="w-full rounded border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/60 transition-colors mb-4"
    >
      New Game
    </button>
  );
}