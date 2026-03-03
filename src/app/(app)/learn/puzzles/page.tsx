
"use client";

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/common/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Puzzle, CheckCircle, XCircle, Loader2, RotateCcw, Lightbulb, Zap } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Move } from 'chess.js';

interface PuzzleData {
  id: string;
  fen: string;
  moves: string;
  rating: number;
}

const samplePuzzles: PuzzleData[] = [
  {
    id: '1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    moves: 'h5f7',
    rating: 1200
  },
  {
    id: '2',
    fen: 'r2qk2r/ppp2ppp/2n1bn2/3pp3/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 1',
    moves: 'd1h5',
    rating: 1500
  },
  {
    id: '3',
    fen: 'r1b1k2r/pppp1ppp/2n2q2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    moves: 'f3g5',
    rating: 1800
  },
  {
    id: '4',
    fen: 'r2qr1k1/ppp2ppp/2n1bn2/3pp3/2PP4/2N1PN2/PP3PPP/R1BQR1K1 w - - 0 1',
    moves: 'c4f7',
    rating: 1400
  },
  {
    id: '5',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: 'c4f7',
    rating: 1100
  }
];

export default function PuzzlesPage() {
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
  const [game, setGame] = useState<Chess>(new Chess());
  const [boardWidth, setBoardWidth] = useState(350);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'correct' | 'incorrect'>('waiting');
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    loadPuzzle(puzzleIndex);
  }, [puzzleIndex]);

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('puzzle-board-container');
      if (container) {
        const width = Math.min(container.clientWidth - 32, 400);
        setBoardWidth(width);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPuzzle = (index: number) => {
    const puzzle = samplePuzzles[index % samplePuzzles.length];
    setCurrentPuzzle(puzzle);
    setGame(new Chess(puzzle.fen));
    setStatus('waiting');
    setSelectedSquare(null);
    setShowHint(false);
  };

  const makeMove = (move: Move): boolean => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const onSquareClick = (square: string) => {
    if (status !== 'waiting' || !currentPuzzle) return;

    if (!selectedSquare) {
      setSelectedSquare(square);
    } else {
      const move = makeMove({
        from: selectedSquare,
        to: square,
        promotion: 'q',
      } as Move);

      if (move) {
        checkAnswer(selectedSquare + square);
      }
      setSelectedSquare(null);
    }
  };

  const checkAnswer = (userMove: string) => {
    if (!currentPuzzle) return;

    const expectedMove = currentPuzzle.moves;
    const isCorrect = userMove === expectedMove || userMove === expectedMove.replace(/([a-h][1-8])([a-h][1-8])/, '$2$1');

    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    if (isCorrect) {
      setStatus('correct');
    } else {
      setStatus('incorrect');
    }
  };

  const nextPuzzle = () => {
    setPuzzleIndex(prev => prev + 1);
  };

  const retryPuzzle = () => {
    if (currentPuzzle) {
      setGame(new Chess(currentPuzzle.fen));
      setStatus('waiting');
      setSelectedSquare(null);
      setShowHint(false);
    }
  };

  const getHint = () => {
    if (!currentPuzzle) return '';
    const moves = currentPuzzle.moves;
    return `Try: ${moves.substring(0, 2)} → ${moves.substring(2, 4)}`;
  };

  return (
    <div className="space-y-8 pb-10">
      <PageTitle 
        title="Chess Puzzles" 
        subtitle="Sharpen your tactical vision with daily puzzles." 
        icon={<Puzzle size={32} className="text-primary"/>} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card glass className="p-4">
            <div id="puzzle-board-container" className="flex justify-center">
              <Chessboard 
                position={game.fen()}
                onSquareClick={onSquareClick}
                boardWidth={boardWidth}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#3d3d3d' }}
                customLightSquareStyle={{ backgroundColor: '#7d7d7d' }}
              />
            </div>

            {currentPuzzle && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Rating: {currentPuzzle.rating} • Puzzle {puzzleIndex + 1} of {samplePuzzles.length}
                </p>
                <div className="flex justify-center gap-4 mt-2">
                  <Button variant="outline" size="sm" onClick={retryPuzzle}>
                    <RotateCcw size={16} className="mr-2" /> Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowHint(!showHint)}>
                    <Lightbulb size={16} className="mr-2" /> Hint
                  </Button>
                </div>
              </div>
            )}

            {showHint && (
              <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-center">
                <p className="text-yellow-300 text-sm">{getHint()}</p>
              </div>
            )}

            {status === 'correct' && (
              <div className="mt-3 p-3 bg-green-900/30 border border-green-700/50 rounded-lg flex items-center justify-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-green-300 font-medium">Correct! Well done!</span>
              </div>
            )}

            {status === 'incorrect' && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center justify-center gap-2">
                <XCircle className="text-red-400" size={20} />
                <span className="text-red-300 font-medium">Not quite right. Try again or see hint.</span>
              </div>
            )}

            {status !== 'waiting' && (
              <div className="mt-3 flex justify-center">
                <Button onClick={nextPuzzle} className="bg-primary hover:bg-primary/90">
                  Next Puzzle <Zap size={16} className="ml-2" />
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card glass className="p-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className="font-medium">{score.correct}/{score.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${score.total > 0 ? (score.correct / score.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Solve more puzzles to improve your rating!
              </p>
            </CardContent>
          </Card>

          <Card glass className="p-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg">How to Play</CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-sm text-muted-foreground space-y-2">
              <p>1. Click on a piece to select it</p>
              <p>2. Click on the destination square to move</p>
              <p>3. Find the best move to solve the puzzle</p>
              <p>4. Use hints if you're stuck</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
