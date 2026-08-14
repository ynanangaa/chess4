import { useState } from 'react';
import { networkGameService } from '../services/network-game-service';
import { useGameService } from '../services/useGameService';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'ws://localhost:4000';

interface LobbyProps {
  onBack: () => void;
}

export function Lobby({ onBack }: LobbyProps) {
  const netGame = useGameService(networkGameService);
  const [joinCode, setJoinCode] = useState('');

  const roomCode = networkGameService.getRoomCode();
  const myColor = networkGameService.getMyColor();
  const lastError = networkGameService.getLastError();
  const occupiedSeats = networkGameService.getOccupiedSeats();
  const hasStarted = networkGameService.getHasStarted();

  function handleCreate() {
    networkGameService.createRoom(BACKEND_URL);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joinCode.trim().length === 6) {
      networkGameService.joinRoom(BACKEND_URL, joinCode.trim().toUpperCase());
    }
  }

  // If we have joined and been assigned a color, but the room hasn't
  // filled all four seats yet, show a waiting screen.
  if (roomCode && myColor && !hasStarted) {
    return (
      <div className="rounded border border-slate-700 bg-slate-800/60 p-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold mb-2">Room Created!</h2>
        <p className="text-slate-400 text-sm mb-4">Share this code with 3 other players:</p>
        <div className="bg-slate-900 border border-slate-700 rounded py-2 px-4 text-2xl font-mono tracking-widest font-bold text-amber-400 mb-6 select-all">
          {roomCode}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-ping mb-2" />
          <p className="text-sm font-semibold capitalize text-slate-300">
            Assigned Seat: <span className="font-bold">{myColor}</span>
          </p>
          <p className="text-xs text-slate-500 mb-1">
            {occupiedSeats.length}/4 players connected
          </p>
          <div className="flex gap-2 mb-2">
            {occupiedSeats.map(color => (
              <span
                key={color}
                className="w-4 h-4 rounded-full border border-slate-600"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500">Waiting for other players to connect...</p>
        </div>
        <button
          onClick={() => { networkGameService.disconnect(); onBack(); }}
          className="mt-6 text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Leave Room
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-700 bg-slate-800/60 p-6 max-w-md w-full">
      <h2 className="text-xl font-bold text-center mb-6">Online Multiplayer</h2>

      {lastError && (
        <div className="rounded border border-red-500 bg-red-500/10 p-3 text-sm text-red-400 mb-4 text-center">
          {lastError}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <button
            onClick={handleCreate}
            className="w-full rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-semibold transition-colors text-sm"
          >
            Create New Game Room
          </button>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase font-semibold">Or</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <div>
            <label htmlFor="code" className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              id="code"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7XPQ2"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-center font-mono text-lg uppercase tracking-wider text-amber-400 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={joinCode.trim().length !== 6}
            className="w-full rounded border border-slate-600 bg-slate-700/40 hover:bg-slate-600/60 px-4 py-2 font-semibold transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Join Existing Room
          </button>
        </form>

        <div className="text-center pt-2">
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-200 underline">
            ← Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}