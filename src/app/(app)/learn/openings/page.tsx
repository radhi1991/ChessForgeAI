
"use client";

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/common/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, BookOpen, ChevronRight, RotateCcw, Target, Layers, Zap } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Move } from 'chess.js';

interface OpeningLine {
  name: string;
  eco: string;
  fen: string;
  description: string;
  moves: string[];
}

const openingData: OpeningLine[] = [
  {
    name: "Ruy Lopez",
    eco: "C60-C99",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 4",
    description: "One of the oldest and most popular openings. White attacks the e5 pawn while developing pieces.",
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"]
  },
  {
    name: "Sicilian Defense",
    eco: "B20-B99",
    fen: "r1bqkbnr/pp1ppppp/2n5/8/3NP3/8/PPP2PPP/R1BQKB1R b KQkq - 0 4",
    description: "A sharp counter-attacking opening where Black meets e4 with c5.",
    moves: ["e4", "c5"]
  },
  {
    name: "French Defense",
    eco: "C00-C19",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2P1P3/5N2/PP1P1PPP/RNBQKB1R b KQkq - 0 4",
    description: "Black attacks the e4 pawn immediately, leading to complex positions.",
    moves: ["e4", "e6", "d4", "d5"]
  },
  {
    name: "Caro-Kann Defense",
    eco: "B10-B19",
    fen: "r1bqkbnr/pp1ppppp/2n5/8/3PN3/8/PPP2PPP/R1BQKB1R b KQkq - 0 4",
    description: "A solid defensive opening with less theory than the Sicilian.",
    moves: ["e4", "c6", "d4", "d5"]
  },
  {
    name: "King's Gambit",
    eco: "C30-C39",
    fen: "r1bqkbnr/pppp1ppp/2n5/8/2B1p3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    description: "An aggressive opening sacrificing a pawn for rapid development.",
    moves: ["e4", "e5", "f4"]
  },
  {
    name: "Queen's Gambit",
    eco: "D06-D69",
    fen: "r1bqkbnr/ppp1pppp/2n5/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 3",
    description: "White offers a pawn to gain control of the center.",
    moves: ["d4", "d5", "c4"]
  },
  {
    name: "English Opening",
    eco: "A10-A39",
    fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 0 1",
    description: "A flexible opening that can transpose into many different structures.",
    moves: ["c4"]
  },
  {
    name: "Dutch Defense",
    eco: "A80-A99",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/5P1p/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2",
    description: "An aggressive response where Black attacks on the kingside early.",
    moves: ["d4", "f5"]
  }
];

export default function OpeningsPage() {
  const [selectedOpening, setSelectedOpening] = useState<OpeningLine | null>(openingData[0]);
  const [game, setGame] = useState<Chess>(new Chess());
  const [boardWidth, setBoardWidth] = useState(300);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  useEffect(() => {
    if (selectedOpening) {
      setGame(new Chess(selectedOpening.fen));
      setCurrentMoveIndex(0);
    }
  }, [selectedOpening]);

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('opening-board-container');
      if (container) {
        const width = Math.min(container.clientWidth - 32, 350);
        setBoardWidth(width);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    } as Move);
    return move;
  };

  const playMove = () => {
    if (!selectedOpening || currentMoveIndex >= selectedOpening.moves.length) return;
    
    const moveNotation = selectedOpening.moves[currentMoveIndex];
    let move: Move | null = null;

    try {
      const result = game.move(moveNotation);
      if (result) {
        setGame(new Chess(game.fen()));
        setCurrentMoveIndex(prev => prev + 1);
      }
    } catch {
      const possibleMoves = game.moves();
      const matchingMove = possibleMoves.find(m => m.startsWith(moveNotation[0]));
      if (matchingMove) {
        const result = game.move(matchingMove);
        if (result) {
          setGame(new Chess(game.fen()));
          setCurrentMoveIndex(prev => prev + 1);
        }
      }
    }
  };

  const resetBoard = () => {
    if (selectedOpening) {
      setGame(new Chess(selectedOpening.fen));
      setCurrentMoveIndex(0);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageTitle 
        title="Chess Openings" 
        subtitle="Explore and study popular chess opening lines." 
        icon={<BrainCircuit size={32} className="text-primary"/>} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card glass className="p-4">
            <div id="opening-board-container" className="flex justify-center">
              <Chessboard 
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={boardWidth}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#3d3d3d' }}
                customLightSquareStyle={{ backgroundColor: '#7d7d7d' }}
              />
            </div>

            {selectedOpening && (
              <div className="mt-4 flex justify-center gap-3">
                <Button variant="outline" onClick={resetBoard}>
                  <RotateCcw size={16} className="mr-2" /> Reset
                </Button>
                <Button 
                  onClick={playMove} 
                  disabled={currentMoveIndex >= selectedOpening.moves.length}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Zap size={16} className="mr-2" /> 
                  {currentMoveIndex >= selectedOpening.moves.length ? 'Complete!' : `Play ${selectedOpening.moves[currentMoveIndex]}`}
                </Button>
              </div>
            )}

            {selectedOpening && currentMoveIndex > 0 && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Moves played: {selectedOpening.moves.slice(0, currentMoveIndex).join(' → ')}
                </p>
              </div>
            )}
          </Card>

          {selectedOpening && (
            <Card glass className="mt-4 p-4">
              <CardHeader className="p-0 pb-2">
                <div className="flex items-center gap-2">
                  <Target size={20} className="text-primary" />
                  <CardTitle className="text-lg">{selectedOpening.name}</CardTitle>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{selectedOpening.eco}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <p className="text-sm text-muted-foreground">{selectedOpening.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card glass className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={18} className="text-primary" />
              <CardTitle className="text-base">Opening Library</CardTitle>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {openingData.map((opening, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedOpening(opening)}
                  className={`w-full text-left p-2 rounded-md transition-colors flex items-center justify-between group ${
                    selectedOpening?.name === opening.name 
                      ? 'bg-primary/20 text-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-sm font-medium truncate">{opening.name}</span>
                  <ChevronRight 
                    size={16} 
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                      selectedOpening?.name === opening.name ? 'opacity-100' : ''
                    }`}
                  />
                </button>
              ))}
            </div>
          </Card>

          <Card glass className="p-3">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers size={18} className="text-primary" /> Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs text-muted-foreground space-y-2">
              <p>• Control the center early</p>
              <p>• Develop pieces before attacking</p>
              <p>• King safety is crucial</p>
              <p>• Don't move the same piece twice</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
