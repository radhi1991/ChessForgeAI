
"use client";

import React, { useState } from 'react';
import PageTitle from '@/components/common/page-title';
import ChessBoardPlaceholder from '@/components/train/chess-board-placeholder';
import TrainingBotInterface from '@/components/train/training-bot-interface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, WandSparkles, BotMessageSquare, MousePointer2 } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const defaultFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function TrainPage() {
  const [currentFenToDisplay, setCurrentFenToDisplay] = useState(defaultFen);
  const [interactiveMode, setInteractiveMode] = useState(false);

  const handleFenAnalyzed = (fen: string) => {
    setCurrentFenToDisplay(fen);
  };

  const handleBoardMove = (fen: string) => {
    setCurrentFenToDisplay(fen);
  };

  return (
    <div className="space-y-8 pb-10">
      <PageTitle 
        title="Position Analyzer & Move Suggester" 
        subtitle="Input a FEN to get Lichess Stockfish analysis for that position." 
        icon={<WandSparkles size={32} className="text-primary"/>} 
      />

      <Card glass className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MousePointer2 size={18} className="text-primary" />
            <Label htmlFor="interactive-mode" className="cursor-pointer">Interactive Mode</Label>
          </div>
          <Switch 
            id="interactive-mode" 
            checked={interactiveMode} 
            onCheckedChange={setInteractiveMode}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enable to make moves on the board. Disable for analysis-only mode.
        </p>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        <div className="lg:col-span-2 animate-slide-up">
          <ChessBoardPlaceholder 
            fen={currentFenToDisplay} 
            onMove={handleBoardMove}
            interactive={interactiveMode}
          />
        </div>
        <div className="lg:col-span-1 animate-slide-up animation-delay-200">
          <TrainingBotInterface onFenAnalyzed={handleFenAnalyzed} initialFen={defaultFen} />
        </div>
      </div>

      <Card glass className="p-6 animate-fade-in animation-delay-400">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl"><BotMessageSquare className="text-accent"/> Play Against a Leveled Bot</CardTitle>
          <CardDescription>
            Want to play a full game against an AI opponent of a specific strength?
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-muted-foreground mb-4">
            Lichess.org offers an excellent "Play with the Computer" feature where you can choose from various ELO-rated Stockfish levels, select your color, and play full games.
          </p>
          <Link href="https://lichess.org/play/computer" target="_blank" rel="noopener noreferrer" passHref>
            <Button variant="outline" className="w-full sm:w-auto border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
              Play on Lichess.org <ExternalLink size={16} className="ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
