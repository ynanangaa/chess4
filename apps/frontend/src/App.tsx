import { useState } from 'react';
import type { Move } from '@chess4/engine';
import { Board } from './board/Board';
import { PlayerStatusBar } from './status/PlayerStatusBar';
import { ScorePanel } from './status/ScorePanel';
import { CapturedPiecesTray } from './status/CapturedPiecesTray';
import { GameOverBanner } from './status/GameOverBanner';
import { NewGameButton } from './status/NewGameButton';
import { ResignButtons } from './status/ResignButtons';
import { ClaimVictoryNotice } from './status/ClaimVictoryNotice';
import { Lobby } from './status/Lobby';

// Services
import { gameService } from './services/game-service';
import { networkGameService } from './services/network-game-service';
import { useGameService } from './services/useGameService';

type PlayMode = 'select' | 'local' | 'online';

function App() {
  const [mode, setPlayMode] = useState<PlayMode>('select');

  // Select which service to observe based on play mode
  const activeService = mode === 'online' ? networkGameService : gameService;
  const game = useGameService(activeService);

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  function clearSelection(): void {
    setSelectedPieceId(null);
    setLegalMoves([]);
  }

  function handleBack() {
    if (mode === 'online') {
      networkGameService.disconnect();
    }
    setPlayMode('select');
    clearSelection();
  }

  function handleSquareClick(squareId: number): void {
    if (game.isOver()) return;

    // Direct check: In online mode, you can only move your own assigned color
    if (mode === 'online') {
      const myColor = networkGameService.getMyColor();
      if (game.getCurrentPlayerColor() !== myColor) return;
    }

    const board = game.getBoard();
    const pieceAtSquare = board.getPieceAt(squareId);

    if (selectedPieceId && pieceAtSquare?.id === selectedPieceId) {
      clearSelection();
      return;
    }

    if (selectedPieceId) {
      const move = legalMoves.find(candidate => candidate.to === squareId);

      if (move) {
        activeService.advanceTurn(move);
        clearSelection();
        return;
      }
    }

    if (pieceAtSquare && pieceAtSquare.color === game.getCurrentPlayerColor()) {
      setSelectedPieceId(pieceAtSquare.id);
      setLegalMoves(game.getLegalMoves(pieceAtSquare.id));
      return;
    }

    clearSelection();
  }

  const board = game.getBoard();
  const selectedPiece = selectedPieceId ? board.getPiece(selectedPieceId) : undefined;
  const selectedSquareId = selectedPiece ? board.getSquareOf(selectedPiece.id) : undefined;

  // ─── Mode 1: Main Menu ───────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-extrabold mb-8 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-500">
          chess4
        </h1>
        <div className="max-w-xs w-full flex flex-col gap-4">
          <button
            onClick={() => setPlayMode('local')}
            className="w-full rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-3 font-semibold transition-colors text-center text-sm"
          >
            Local Pass & Play
          </button>
          <button
            onClick={() => setPlayMode('online')}
            className="w-full rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-semibold transition-colors text-center text-sm"
          >
            Online Multiplayer
          </button>
        </div>
      </div>
    );
  }

  // ─── Mode 2: Online Lobby ────────────────────────────────────────
  // Render Lobby screen if in online mode, but we don't have our seat-color assigned yet,
  // or the game hasn't started (the game is not over and no pieces exist on the board snapshot yet).
  const myColor = networkGameService.getMyColor();
  const hasStarted = networkGameService.getHasStarted();

  if (mode === 'online' && (!myColor || !hasStarted)) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
        <Lobby onBack={handleBack} />
      </div>
    );
  }

  // ─── Mode 3: Main Gameplay ───────────────────────────────────────
  // Derive perspective:
  // - In local mode, the board rotates automatically to whoever's turn it is.
  // - In online mode, the board stays permanently oriented to *your* assigned color seat.
  const perspective = mode === 'online' ? myColor! : game.getCurrentPlayerColor();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        
        {/* Left Column Controls */}
        <div className="order-2 lg:order-1 flex flex-col">
          {mode === 'local' ? (
            <NewGameButton />
          ) : (
            <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 mb-4 text-center text-xs">
              <span className="text-slate-400">Seat: </span>
              <span className="font-bold uppercase text-amber-400">{myColor}</span>
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-slate-400">Room: </span>
              <span className="font-mono font-bold text-slate-200">{networkGameService.getRoomCode()}</span>
            </div>
          )}

          <ScorePanel game={activeService} />
          <CapturedPiecesTray game={activeService} />
          <ClaimVictoryNotice game={activeService} />

          <button
            onClick={handleBack}
            className="w-full rounded border border-slate-700 bg-slate-900/40 hover:bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mt-auto"
          >
            ← Exit Game
          </button>
        </div>

        {/* Board and Status Bars */}
        <div className="order-1 lg:order-2">
          <h1 className="text-2xl font-bold mb-2 text-center">chess4</h1>

          <GameOverBanner game={activeService} />
          <PlayerStatusBar game={activeService} />

          <div className="relative w-full max-w-[700px] mx-auto">
            <Board
              board={board}
              perspective={perspective}
              selectedSquareId={selectedSquareId}
              selectedColor={selectedPiece?.color}
              legalDestinations={legalMoves.map(move => move.to)}
              onSquareClick={handleSquareClick}
            />
            <ResignButtons 
              game={activeService}
              myColor={mode === 'online' ? myColor : undefined}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;