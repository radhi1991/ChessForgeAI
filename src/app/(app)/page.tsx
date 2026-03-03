
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageTitle from "@/components/common/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { 
  BarChart3, BrainCircuit, LayoutDashboard, AlertTriangle, TrendingUp, TrendingDown, 
  Puzzle, Loader2, Info, UserSearch, FileSignature, Target, Activity, Trophy, ShieldQuestion, GitMerge
} from "lucide-react";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { cn } from "@/lib/utils";

// Import types from the new API route locations
import { type FetchGameHistoryInput, type FetchGameHistoryOutput } from '@/app/api/ai/fetch-game-history/route';
import { type DeepAnalyzeGameMetricsInput, type DeepAnalyzeGameMetricsOutput } from '@/app/api/ai/deep-analyze-game-metrics/route';


interface Insight {
  id: string;
  title: string;
  value: string | number; 
  icon: React.ReactNode;
  description?: string; 
  color?: string; 
  trainingLink?: string; 
  severity?: "high" | "medium" | "low";
  type?: "metric" | "weakness" | "stat";
  unit?: string;
  colSpan?: string; // For bento grid: 'lg:col-span-1', 'lg:col-span-2', etc.
  rowSpan?: string; // For bento grid: 'lg:row-span-1', 'lg:row-span-2', etc.
}

interface PgnTag {
  name: string;
  value: string;
}

interface ParsedPgnGame {
  tags: PgnTag[];
  moves: string;
  result?: string;
  whitePlayer?: string;
  blackPlayer?: string;
  whiteElo?: number;
  blackElo?: number;
  whiteRatingDiff?: string; // e.g. "+5" or "-10"
  blackRatingDiff?: string;
  opening?: string;
  date?: Date;
}

function parsePgn(pgn: string): ParsedPgnGame {
  const tags: PgnTag[] = [];
  let moves = "";
  const lines = pgn.split('\n');
  let inHeaders = true;

  for (const line of lines) {
    if (line.startsWith('[')) {
      const match = line.match(/\[([A-Za-z0-9_]+) "(.*?)"\]/);
      if (match) {
        tags.push({ name: match[1], value: match[2] });
      }
    } else if (line.trim() !== "" && !line.startsWith('%')) {
      inHeaders = false;
      moves += line + " ";
    }
  }
  moves = moves.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '').trim();

  const getTag = (name: string) => tags.find(tag => tag.name === name)?.value;
  
  let date;
  const dateStr = getTag("Date") || getTag("UTCDate");
  if (dateStr && dateStr !== "?") {
    const [year, month, day] = dateStr.split('.').map(Number);
    if (year && month && day) {
      date = new Date(year, month -1, day);
    }
  }


  return {
    tags,
    moves,
    result: getTag("Result"),
    whitePlayer: getTag("White"),
    blackPlayer: getTag("Black"),
    whiteElo: parseInt(getTag("WhiteElo") || "", 10) || undefined,
    blackElo: parseInt(getTag("BlackElo") || "", 10) || undefined,
    whiteRatingDiff: getTag("WhiteRatingDiff"),
    blackRatingDiff: getTag("BlackRatingDiff"),
    opening: getTag("Opening"),
    date: date,
  };
}


function getLucideIcon(iconName?: string): React.ReactNode {
  const icons: { [key: string]: React.ReactNode } = {
    AlertTriangle: <AlertTriangle size={24} className="text-yellow-400" />,
    Puzzle: <Puzzle size={24} className="text-blue-400" />,
    BrainCircuit: <BrainCircuit size={24} className="text-purple-400" />,
    TrendingDown: <TrendingDown size={24} className="text-red-400" />,
    TrendingUp: <TrendingUp size={24} className="text-green-400" />,
    BarChart3: <BarChart3 size={24} className="text-indigo-400" />,
    Info: <Info size={24} className="text-gray-400"/>,
    Target: <Target size={24} className="text-red-500"/>, // For blunders
    Activity: <Activity size={24} className="text-teal-400"/>, // For overall activity/trends
    Trophy: <Trophy size={24} className="text-amber-400"/>, // For wins/achievements
    ShieldQuestion: <ShieldQuestion size={24} className="text-orange-400"/>, // For mistakes
    GitMerge: <GitMerge size={24} className="text-sky-400"/> // For opening consistency or variations
  };
  if (iconName && icons[iconName]) {
    return icons[iconName];
  }
  return <Info size={24} className="text-gray-400" />; 
}

const defaultInsights: Insight[] = [
  {
    id: 'welcome_message',
    title: "Welcome to ChessForgeAI!",
    value: "Connect Your Lichess Account",
    icon: <FileSignature size={32} className="text-primary"/>,
    description: "Enter your Lichess username below to fetch game history and unlock personalized insights.",
    type: "metric",
    colSpan: "lg:col-span-2",
    rowSpan: "lg:row-span-1",
  },
];

const lichessUsernameSchema = z.object({
  lichessUsername: z.string().min(2, "Username must be at least 2 characters.").max(50, "Username too long."),
});
type LichessUsernameFormValues = z.infer<typeof lichessUsernameSchema>;

interface PerformanceDataPoint {
  game: number;
  date: string;
  rating?: number;
  opponentElo?: number;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [analysisInsights, setAnalysisInsights] = useState<Insight[]>(defaultInsights);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>("Enter your Lichess username below or use the Analysis page to get started.");
  const [isFetchingLichessGames, setIsFetchingLichessGames] = useState(false);
  const [recentGames, setRecentGames] = useState<ParsedPgnGame[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);


  const lichessForm = useForm<LichessUsernameFormValues>({
    resolver: zodResolver(lichessUsernameSchema),
    defaultValues: { lichessUsername: "" },
  });

  const processAndDisplayAnalysis = (analysisOutput: DeepAnalyzeGameMetricsOutput, username: string, fetchedGames: ParsedPgnGame[]) => {
    setAnalysisSummary(analysisOutput.overallSummary || `Analysis complete for ${username}.`);
    setActiveUsername(username);

    const weaknessInsights = analysisOutput.primaryWeaknesses.map((weakness, index) => ({
      id: weakness.name.toLowerCase().replace(/\s+/g, '_') || `weakness-${index}`,
      title: weakness.name,
      value: weakness.trainingSuggestion.text,
      icon: getLucideIcon(weakness.icon),
      description: weakness.description,
      severity: weakness.severity,
      trainingLink: weakness.trainingSuggestion.link,
      color: weakness.severity === 'high' ? 'text-destructive' : weakness.severity === 'medium' ? 'text-yellow-400' : 'text-green-400',
      type: "weakness",
      colSpan: "lg:col-span-1",
      rowSpan: "lg:row-span-1",
    } as Insight));
    
    // Stats from fetchedGames
    let wins = 0;
    let losses = 0;
    let draws = 0;
    fetchedGames.forEach(game => {
      if (game.whitePlayer?.toLowerCase() === username.toLowerCase()) {
        if (game.result === "1-0") wins++;
        else if (game.result === "0-1") losses++;
        else if (game.result === "1/2-1/2") draws++;
      } else if (game.blackPlayer?.toLowerCase() === username.toLowerCase()) {
        if (game.result === "0-1") wins++;
        else if (game.result === "1-0") losses++;
        else if (game.result === "1/2-1/2") draws++;
      }
    });

    const gameStatsInsights: Insight[] = [
      { id: 'total_games', title: 'Games Analyzed', value: fetchedGames.length, icon: <BarChart3 size={24} className="text-indigo-400" />, type: 'stat', colSpan: 'lg:col-span-1' },
      { id: 'wins', title: 'Wins', value: wins, icon: <Trophy size={24} className="text-green-400" />, type: 'stat', colSpan: 'lg:col-span-1' },
      { id: 'losses', title: 'Losses', value: losses, icon: <TrendingDown size={24} className="text-red-400" />, type: 'stat', colSpan: 'lg:col-span-1' },
      { id: 'draws', title: 'Draws', value: draws, icon: <ShieldQuestion size={24} className="text-gray-400" />, type: 'stat', colSpan: 'lg:col-span-1' },
    ];
    
    setAnalysisInsights([...gameStatsInsights, ...weaknessInsights]);
    setRecentGames(fetchedGames.slice(0, 5)); // Display up to 5 recent games

    // Performance data
    const newPerformanceData: PerformanceDataPoint[] = fetchedGames
    .filter(game => game.date) // Ensure game has a date
    .sort((a,b) => a.date!.getTime() - b.date!.getTime()) // Sort by date
    .map((game, index) => {
      let rating;
      let opponentElo;
      if (game.whitePlayer?.toLowerCase() === username.toLowerCase()) {
        rating = game.whiteElo;
        if (game.whiteRatingDiff) {
            const diff = parseInt(game.whiteRatingDiff);
            if (rating && !isNaN(diff)) rating -= diff; // Estimate rating before this game
        }
        opponentElo = game.blackElo;
      } else if (game.blackPlayer?.toLowerCase() === username.toLowerCase()) {
        rating = game.blackElo;
         if (game.blackRatingDiff) {
            const diff = parseInt(game.blackRatingDiff);
            if (rating && !isNaN(diff)) rating -= diff; // Estimate rating before this game
        }
        opponentElo = game.whiteElo;
      }
      return {
        game: index + 1,
        date: game.date!.toLocaleDateString('en-CA'), // YYYY-MM-DD for consistency
        rating: rating,
        opponentElo: opponentElo
      };
    }).filter(point => point.rating !== undefined); // Only include points where user's rating is known
    setPerformanceData(newPerformanceData);

  };

  const onFetchLichessGamesSubmit: SubmitHandler<LichessUsernameFormValues> = async (data) => {
    setIsFetchingLichessGames(true);
    setAnalysisSummary("Fetching your Lichess game history...");
    setAnalysisInsights([{
      id: 'loading_lichess',
      title: "Fetching Lichess Games...",
      value: `Looking for games for ${data.lichessUsername}.`,
      icon: <Loader2 className="animate-spin text-primary" size={32} />,
      description: "This might take a moment.",
      type: "metric",
      colSpan: "lg:col-span-full",
    }]);
    setRecentGames([]);
    setPerformanceData([]);
    setActiveUsername(data.lichessUsername);

    try {
      const historyInputPayload: FetchGameHistoryInput = { platform: "lichess", username: data.lichessUsername, maxGames: 20 };
      const historyResponse = await fetch('/api/ai/fetch-game-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyInputPayload),
      });

      if (!historyResponse.ok) {
        const errorData = await historyResponse.json().catch(() => ({ error: 'Fetch game history request failed with status ' + historyResponse.status }));
        throw new Error(errorData.error || `Failed to fetch game history for ${data.lichessUsername}`);
      }
      const historyOutput: FetchGameHistoryOutput = await historyResponse.json();
      const fetchedParsedGames = historyOutput.games.map(parsePgn).filter(g => g.tags.length > 0);

      if (fetchedParsedGames.length > 0) {
        toast({
          title: "Games Fetched!",
          description: `Found ${fetchedParsedGames.length} games for ${data.lichessUsername}. Now analyzing...`,
        });
        setAnalysisSummary(`Analyzing ${fetchedParsedGames.length} games for ${data.lichessUsername}...`);
        setAnalysisInsights([{
          id: 'analyzing_lichess',
          title: "Analyzing Games...",
          value: `Processing ${fetchedParsedGames.length} games.`,
          icon: <Loader2 className="animate-spin text-primary" size={32} />,
          description: "Generating insights based on your play.",
          type: "metric",
          colSpan: "lg:col-span-full",
        }]);

        // Call the new API route for deepAnalyzeGameMetrics
        const deepAnalysisInput: DeepAnalyzeGameMetricsInput = {
          gamePgns: historyOutput.games,
          playerUsername: data.lichessUsername,
          baseUrl: window.location.origin // Provide current origin as baseUrl
        };
        const deepAnalysisResponse = await fetch('/api/ai/deep-analyze-game-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deepAnalysisInput),
        });

        if (!deepAnalysisResponse.ok) {
          const errorData = await deepAnalysisResponse.json().catch(() => ({ error: 'Deep analysis request failed with status ' + deepAnalysisResponse.status }));
          throw new Error(errorData.error || `Failed to perform deep analysis for ${data.lichessUsername}`);
        }
        const deepAnalysis: DeepAnalyzeGameMetricsOutput = await deepAnalysisResponse.json();

        processAndDisplayAnalysis(deepAnalysis, data.lichessUsername, fetchedParsedGames);
        toast({
          title: "Analysis Complete",
          description: `Personalized insights for ${data.lichessUsername} are ready.`,
        });

      } else {
        toast({
          title: "No Games Found",
          description: `Could not find recent games for ${data.lichessUsername} on Lichess or an error occurred. Ensure the username is correct and games are public.`,
          variant: "default", 
        });
        setAnalysisSummary(`No Lichess games found for ${data.lichessUsername}. Try checking the username or play some games!`);
        setAnalysisInsights([{
          id: 'no_lichess_games',
          title: "No Lichess Games",
          value: "Please check the username or try again later.",
          icon: getLucideIcon("Info"),
          description: "Ensure the Lichess profile is public and has recent games.",
          type: "metric",
          colSpan: "lg:col-span-full",
        }]);
      }
    } catch (error) {
      console.error("Error fetching/analyzing Lichess history:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to process Lichess history for ${data.lichessUsername}. ${errorMessage}`,
        variant: "destructive",
      });
      setAnalysisSummary(`Error processing games for ${data.lichessUsername}.`);
      setAnalysisInsights([{
        id: 'error_lichess_processing',
        title: "Processing Error",
        value: "Could not fetch or analyze Lichess games.",
        icon: getLucideIcon("AlertTriangle"),
        description: errorMessage,
        type: "metric",
        colSpan: "lg:col-span-full",
      }]);
    } finally {
      setIsFetchingLichessGames(false);
    }
  };


  useEffect(() => {
    // Initial state for first load if desired, otherwise covered by defaultInsights
    setIsLoadingInsights(false); 
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <PageTitle title="Dashboard" subtitle={`Insights for ${activeUsername || 'your chess performance'}`} icon={<LayoutDashboard size={32} className="text-primary" />} />

      <Card glass className="p-6 animate-fade-in">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl"><UserSearch size={28}/> Connect Lichess Account</CardTitle>
          <CardDescription>Enter your Lichess.org username to fetch recent games and get personalized insights.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Form {...lichessForm}>
            <form onSubmit={lichessForm.handleSubmit(onFetchLichessGamesSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
              <FormField
                control={lichessForm.control}
                name="lichessUsername"
                render={({ field }) => (
                  <FormItem className="flex-grow w-full sm:w-auto">
                    <FormLabel htmlFor="lichessUsername" className="sr-only">Lichess Username</FormLabel>
                    <FormControl>
                      <Input id="lichessUsername" placeholder="e.g., DrNykterstein" {...field} className="bg-background/50 border-border/50 placeholder-muted-foreground/70 text-lg"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isFetchingLichessGames || !lichessForm.formState.isValid} className="w-full sm:w-auto text-base py-3 px-6">
                {isFetchingLichessGames ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserSearch className="mr-2 h-5 w-5" />}
                Fetch & Analyze
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {analysisSummary && !isFetchingLichessGames && (
        <Card glass className="p-6 animate-fade-in animation-delay-200">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xl">AI Coach Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground">{analysisSummary}</p>
          </CardContent>
        </Card>
      )}
      
      <div className="bento-grid lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '400ms' }}>
        {analysisInsights.map((insight, index) => (
          <Card 
            key={insight.id} 
            glass 
            className={cn(
              "p-4 sm:p-6 flex flex-col",
              insight.colSpan || "lg:col-span-1",
              insight.rowSpan || "lg:row-span-1",
              "animate-slide-up"
            )}
            style={{ animationDelay: `${200 + index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-0">
              <div className="space-y-1">
                <CardTitle className={cn("text-lg font-medium", insight.color || 'text-foreground')}>{insight.title}</CardTitle>
                {insight.severity && (
                   <span className={`px-2 py-0.5 text-xs rounded-full ${
                    insight.severity === "high" ? "bg-red-900/70 text-red-300" :
                    insight.severity === "medium" ? "bg-yellow-900/70 text-yellow-300" :
                    "bg-green-900/70 text-green-300" 
                  }`}>
                    {insight.severity}
                  </span>
                )}
              </div>
              <span className={cn("opacity-70", insight.color || 'text-muted-foreground')}>{insight.icon}</span>
            </CardHeader>
            <CardContent className="flex-grow p-0 pt-2">
              <div className={`text-2xl font-semibold ${insight.color || 'text-foreground'}`}>
                {typeof insight.value === 'number' ? insight.value.toLocaleString() : insight.value}
                {insight.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{insight.unit}</span>}
              </div>
              {insight.description && <p className="text-xs text-muted-foreground pt-1">{insight.description}</p>}
            </CardContent>
            {insight.trainingLink && (
              <CardContent className="p-0 pt-4">
                <Link href={insight.trainingLink} passHref>
                  <Button variant="outline" size="sm" className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
                    Train This Area
                  </Button>
                </Link>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="bento-grid lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '600ms' }}>
         {performanceData.length > 0 && (
          <Card glass className="p-4 sm:p-6 lg:col-span-2 animate-slide-up" style={{ animationDelay: '800ms' }}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xl">Performance Trend</CardTitle>
              <CardDescription>Your approximate Lichess rating over the last {performanceData.length} analyzed games.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[350px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={['dataMin - 50', 'dataMax + 50']} allowDataOverflow={true} />
                  <RechartsTooltip
                    contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend wrapperStyle={{fontSize: "12px"}}/>
                  <Line type="monotone" dataKey="rating" name="Your Rating" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="opponentElo" name="Opponent Rating" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--secondary))' }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {recentGames.length > 0 && (
          <Card glass className="p-4 sm:p-6 lg:col-span-2 animate-slide-up" style={{ animationDelay: '1000ms' }}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <CardDescription>Your latest {recentGames.length} analyzed games.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-3">
              {recentGames.map((game, index) => {
                const opponent = game.whitePlayer?.toLowerCase() === activeUsername?.toLowerCase() ? game.blackPlayer : game.whitePlayer;
                const userColor = game.whitePlayer?.toLowerCase() === activeUsername?.toLowerCase() ? "White" : "Black";
                let gameResultText = "Unknown";
                let resultColor = "bg-gray-700/70 text-gray-300";

                if (userColor === "White") {
                    if (game.result === "1-0") { gameResultText = "Win"; resultColor = "bg-green-800/70 text-green-300"; }
                    else if (game.result === "0-1") { gameResultText = "Loss"; resultColor = "bg-red-800/70 text-red-300"; }
                    else if (game.result === "1/2-1/2") { gameResultText = "Draw"; resultColor = "bg-yellow-800/70 text-yellow-300"; }
                } else { // User is Black
                    if (game.result === "0-1") { gameResultText = "Win"; resultColor = "bg-green-800/70 text-green-300"; }
                    else if (game.result === "1-0") { gameResultText = "Loss"; resultColor = "bg-red-800/70 text-red-300"; }
                    else if (game.result === "1/2-1/2") { gameResultText = "Draw"; resultColor = "bg-yellow-800/70 text-yellow-300"; }
                }
                
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-background/20 rounded-lg border border-white/10 shadow-inner-glow">
                    <div>
                      <p className="font-medium text-foreground">vs {opponent || "Unknown Opponent"}</p>
                      <p className="text-xs text-muted-foreground">{game.opening || "Unknown Opening"} ({userColor})</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${resultColor}`}>
                      {gameResultText}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {(!performanceData.length && !recentGames.length && !isFetchingLichessGames && activeUsername) && (
            <Card glass className="p-6 lg:col-span-2 text-center animate-slide-up">
                <Info size={40} className="mx-auto text-muted-foreground mb-2"/>
                <CardTitle className="text-xl mb-1">Not Enough Data</CardTitle>
                <CardDescription>Could not extract enough information for performance trends or recent activity from the fetched games. More games or PGNs with rating info might be needed.</CardDescription>
            </Card>
        )}
      </div>
    </div>
  );
}
