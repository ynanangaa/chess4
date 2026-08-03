import { Color as EngineColor } from '@chess4/engine';
import type { CapturedPiece, Color, Game } from '@chess4/engine';
import { Piece } from '../pieces/Piece';
import { GameService } from '../services/game-service';

const PLAYER_ORDER: Color[] = [
  EngineColor.RED,
  EngineColor.BLUE,
  EngineColor.YELLOW,
  EngineColor.GREEN,
];

interface CapturedPiecesTrayProps {
  game: GameService;
}

export function CapturedPiecesTray({ game }: CapturedPiecesTrayProps) {
  const captured = game.getAllCapturedPieces();

  const byColor = new Map<Color, CapturedPiece[]>(
    PLAYER_ORDER.map(color => [color, [] as CapturedPiece[]])
  );

  for (const piece of captured) {
    byColor.get(piece.capturedBy)?.push(piece);
  }

  return (
    <div className="rounded border border-slate-700 bg-slate-800/60 p-3 mb-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-2">Captures</h2>
      <div className="grid grid-cols-2 gap-3">
        {PLAYER_ORDER.map(color => {
          const pieces = byColor.get(color) ?? [];

          return (
            <div key={color} className="flex flex-col gap-1">
              <span className="text-xs capitalize text-slate-400">{color}</span>
              <div className="flex flex-wrap gap-1 min-h-[1.5rem]">
                {pieces.length === 0 && (
                  <span className="text-xs text-slate-600">—</span>
                )}
                {pieces.map(piece => (
                  <div key={piece.id} className="w-6 h-6 opacity-90">
                    <Piece piece={piece} inactive={!piece.wasActive} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}