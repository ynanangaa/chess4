import { useEffect, useState } from 'react';
import { Game, DefaultRuleSet, MoveGenerator } from '@chess4/engine';

function App() {
  const [boardState, setBoardState] = useState<string>('');

  useEffect(() => {
    const game = new Game(new DefaultRuleSet(new MoveGenerator()));

    console.log('Current player:', game.getCurrentPlayerColor());
    console.log('Legal moves for red-1:', game.getLegalMoves('red-1'));

    setBoardState(game.getBoard().toString());
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">chess4 — engine wiring check</h1>
        <p className="mb-2 text-slate-400">
          Open the console to see current player and legal moves for{' '}
          <code className="bg-slate-800 px-1 rounded">red-1</code>.
        </p>
        <pre className="bg-slate-800 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {boardState}
        </pre>
      </div>
    </div>
  );
}

export default App;