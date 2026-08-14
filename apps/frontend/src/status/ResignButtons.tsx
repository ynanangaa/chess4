import { Color as EngineColor } from '@chess4/engine';
import type { Color } from '@chess4/engine';
import type { GameService } from '../services/game-service';

/** Matches the 3x3 cut-corner regions excluded from play (see `validBoardSquares`). */
const CORNER_FRACTION = 3 / 14;

const RESIGN_BUTTON_CLASSES: Record<Color, string> = {
  red: 'border-red-500 text-red-400 hover:bg-red-500/10',
  blue: 'border-blue-500 text-blue-400 hover:bg-blue-500/10',
  yellow: 'border-yellow-400 text-yellow-300 hover:bg-yellow-400/10',
  green: 'border-green-500 text-green-400 hover:bg-green-500/10',
};

interface ResignButtonProps {
  game: GameService;
  color: Color;
}

function ResignButton({ game, color }: ResignButtonProps) {
  const disabled = game.isOver() || !game.isPlayerActive(color);

  function handleClick(): void {
    if (window.confirm(`${color.toUpperCase()}: are you sure you want to resign?`)) {
      game.resignPlayer(color);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={[
        'w-full rounded border px-1 py-1 text-[9px] sm:text-xs leading-tight font-semibold uppercase tracking-wide',
        'bg-slate-900/80 backdrop-blur-sm transition-colors',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        RESIGN_BUTTON_CLASSES[color],
      ].join(' ')}
    >
      {color} resign
    </button>
  );
}

interface ResignButtonsProps {
  game: GameService;
  /**
   * If provided, only this color's resign button is rendered — used in
   * online mode, where a client may only resign their own assigned
   * seat. Omit entirely for local pass-and-play, where any of the four
   * seats may resign at any time from a shared screen.
   */
  myColor?: Color;
}

/**
 * Overlays a resign button for every player onto the board's two
 * left-side cut corners: the top-left corner hosts RED and BLUE, the
 * bottom-left corner hosts YELLOW and GREEN. A player can resign at any
 * time regardless of whose turn it currently is — resignation itself
 * carries no turn-order restriction (see `RuleSet.resignPlayer`) — so
 * these buttons are always active as long as that player hasn't already
 * left the game.
 *
 * Sized as a percentage of its positioned ancestor rather than tied to
 * `Board`'s own internal CSS grid, so `Board` itself stays unaware of
 * the game service — the ancestor must be sized/positioned to exactly
 * match the rendered board (see `App`'s wrapping `relative` container).
 */
export function ResignButtons({ game, myColor }: ResignButtonsProps) {
  const cornerStyle = {
    width: `${CORNER_FRACTION * 100}%`,
    height: `${CORNER_FRACTION * 100}%`,
  };

  const show = (color: Color) => myColor === undefined || myColor === color;

  return (
    <>
      <div className="absolute top-0 left-0 z-10 flex flex-col justify-center gap-1 p-1" style={cornerStyle}>
        {show(EngineColor.RED) && <ResignButton game={game} color={EngineColor.RED} />}
        {show(EngineColor.BLUE) && <ResignButton game={game} color={EngineColor.BLUE} />}
      </div>

      <div className="absolute bottom-0 left-0 z-10 flex flex-col justify-center gap-1 p-1" style={cornerStyle}>
        {show(EngineColor.YELLOW) && <ResignButton game={game} color={EngineColor.YELLOW} />}
        {show(EngineColor.GREEN) && <ResignButton game={game} color={EngineColor.GREEN} />}
      </div>
    </>
  );
}