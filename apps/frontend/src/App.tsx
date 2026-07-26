import { useReducer, useState } from 'react';
import { Game, DefaultRuleSet, MoveGenerator, type Move } from '@chess4/engine';
import { Board } from './board/Board';

function App() {
  const [game] = useState(() => new Game(new DefaultRuleSet(new MoveGenerator())));

  // Game/Board are mutated in place by advanceTurn rather than replaced,
  // so React has no reference change to detect. This counter's only job
  // is to change on every move, giving React a reason to re-render and
  // pick up the mutated board state.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  function handleSquareClick(squareId: number): void {
    if (game.isOver()) return;

    const board = game.getBoard();
    const pieceAtSquare = board.getPieceAt(squareId);

    // Clicking the already-selected piece again deselects it.
    if (selectedPieceId && pieceAtSquare?.id === selectedPieceId) {
      setSelectedPieceId(null);
      setLegalMoves([]);
      return;
    }

    // Clicking a legal destination plays that exact move (already
    // carrying any castle/en-passant/promotion flags from getLegalMoves).
    if (selectedPieceId) {
      const move = legalMoves.find(candidate => candidate.to === squareId);
      if (move) {
        game.advanceTurn(move);
        setSelectedPieceId(null);
        setLegalMoves([]);
        forceRender();
        return;
      }
    }

    // Otherwise, try selecting a new piece belonging to the player to move.
    if (pieceAtSquare && pieceAtSquare.color === game.getCurrentPlayerColor()) {
      setSelectedPieceId(pieceAtSquare.id);
      setLegalMoves(game.getLegalMoves(pieceAtSquare.id));
      return;
    }

    // Clicked an empty/opponent square with no relevance: clear selection.
    setSelectedPieceId(null);
    setLegalMoves([]);
  }

  const selectedSquareId = selectedPieceId
    ? game.getBoard().getPositionOf(selectedPieceId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-2 text-center">chess4</h1>
        <p className="text-center mb-4 capitalize text-slate-400">
          {game.isOver() ? 'Game over' : `${game.getCurrentPlayerColor()} to move`}
        </p>
        <Board
          board={game.getBoard()}
          selectedSquareId={selectedSquareId}
          legalDestinations={legalMoves.map(move => move.to)}
          onSquareClick={handleSquareClick}
        />
      </div>
    </div>
  );
}

export default App;