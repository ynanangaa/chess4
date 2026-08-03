import { useState } from 'react';
import type { Move } from '@chess4/engine';
import { Board } from './board/Board';
import { PlayerStatusBar } from './status/PlayerStatusBar';
import { ScorePanel } from './status/ScorePanel';
import { CapturedPiecesTray } from './status/CapturedPiecesTray';
import { GameOverBanner } from './status/GameOverBanner';
import { gameService } from './services/game-service';
import { useGameService } from './services/useGameService';
import { NewGameButton } from './status/NewGameButton';

function App() {
  const game = useGameService();

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
        gameService.advanceTurn(move);
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="order-2 lg:order-1 flex flex-col">
          <NewGameButton />
          <ScorePanel game={gameService} />
          <CapturedPiecesTray game={gameService} />
        </div>

        <div className="order-1 lg:order-2">
          <h1 className="text-2xl font-bold mb-2 text-center">chess4</h1>

          <GameOverBanner game={gameService} />

          <PlayerStatusBar game={gameService} />

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