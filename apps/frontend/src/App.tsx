import { useReducer, useState } from 'react';
import {
  Game,
  DefaultRuleSet,
  MoveGenerator,
  type Move,
} from '@chess4/engine';
import { Board } from './board/Board';
import { PlayerStatusBar } from './status/PlayerStatusBar';
import { ScorePanel } from './status/ScorePanel';
import { CapturedPiecesTray } from './status/CapturedPiecesTray';
import { GameOverBanner } from './status/GameOverBanner';

function App() {
  const [game] = useState(
    () => new Game(new DefaultRuleSet(new MoveGenerator()))
  );

  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  function clearSelection(): void {
    setSelectedPieceId(null);
    setLegalMoves([]);
  }

  function handleSquareClick(squareId: number): void {
    if (game.isOver()) return;

    const board = game.getBoard();
    const pieceAtSquare = board.getPieceAt(squareId);

    if (selectedPieceId && pieceAtSquare?.id === selectedPieceId) {
      clearSelection();
      return;
    }

    if (selectedPieceId) {
      const move = legalMoves.find(candidate => candidate.to === squareId);

      if (move) {
        game.advanceTurn(move);
        clearSelection();
        forceRender();
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

  if (import.meta.env.DEV) {
    (window as any).debugGame = game;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="order-2 lg:order-1 flex flex-col">
          <ScorePanel game={game} />
          <CapturedPiecesTray game={game} />
        </div>

        <div className="order-1 lg:order-2">
          <h1 className="text-2xl font-bold mb-2 text-center">chess4</h1>

          <GameOverBanner game={game} />

          <PlayerStatusBar game={game} />

          <Board
            board={board}
            selectedSquareId={selectedSquareId}
            selectedColor={selectedPiece?.color}
            legalDestinations={legalMoves.map(move => move.to)}
            onSquareClick={handleSquareClick}
          />
        </div>
      </div>
    </div>
  );
}

export default App;