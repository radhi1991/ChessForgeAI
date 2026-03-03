
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Chessboard } from 'react-chessboard';
import { Chess, type Move } from 'chess.js';

interface ChessBoardPlaceholderProps {
  fen?: string;
  onMove?: (fen: string) => void;
  interactive?: boolean;
}

const ChessBoardPlaceholder: React.FC<ChessBoardPlaceholderProps> = ({ 
  fen, 
  onMove,
  interactive = false 
}) => {
  const [game, setGame] = useState<Chess>(new Chess(fen));
  const [boardWidth, setBoardWidth] = useState(400);

  useEffect(() => {
    if (fen) {
      const newGame = new Chess(fen);
      setGame(newGame);
    }
  }, [fen]);

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('chessboard-container');
      if (container) {
        const width = Math.min(container.clientWidth, 500);
        setBoardWidth(width);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const makeMove = useCallback((move: Move): boolean => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setGame(gameCopy);
        onMove?.(gameCopy.fen());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [game, onMove]);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    } as Move);
    return move;
  }, [makeMove]);

  const isCheck = game.inCheck();
  const gameOver = game.isGameOver();

  return (
    <Card glass className="aspect-square w-full max-w-lg mx-auto p-2 sm:p-3">
      <CardContent 
        id="chessboard-container"
        className="p-0 flex flex-col items-center justify-center h-full bg-background/20 rounded-lg shadow-inner-glow"
      >
        <div className="w-full flex justify-center">
          <Chessboard 
            position={game.fen()}
            onPieceDrop={interactive ? onDrop : undefined}
            boardWidth={boardWidth}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#3d3d3d' }}
            customLightSquareStyle={{ backgroundColor: '#7d7d7d' }}
          />
        </div>
        
        {interactive && (
          <div className="mt-3 flex gap-2">
            <button 
              onClick={() => {
                const newGame = new Chess();
                setGame(newGame);
                onMove?.(newGame.fen());
              }}
              className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
              Reset Board
            </button>
          </div>
        )}

        {isCheck && !gameOver && (
          <p className="mt-2 text-sm text-red-400 font-medium">Check!</p>
        )}
        
        {gameOver && (
          <p className="mt-2 text-sm font-medium">
            {game.isCheckmate() && (
              <span className="text-red-400">Checkmate! {game.turn() === 'w' ? 'Black' : 'White'} wins</span>
            )}
            {game.isDraw() && <span className="text-yellow-400">Draw</span>}
            {!game.isCheckmate() && !game.isDraw() && (
              <span className="text-muted-foreground">Game Over</span>
            )}
          </p>
        )}

        {fen && (
          <div className="mt-3 p-2 bg-background/40 rounded-md w-full max-w-xs sm:max-w-sm md:max-w-md text-center">
            <p className="text-xs font-code text-muted-foreground break-all">
              {game.turn() === 'w' ? "White" : "Black"} to move
            </p>
            <p className="text-xs font-code text-foreground break-all mt-1">
              {fen}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChessBoardPlaceholder;
