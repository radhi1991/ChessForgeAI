
"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import PageTitle from '@/components/common/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Lightbulb, Loader2, AlertCircle, CheckCircle, UserSearch, BarChartHorizontalBig } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from 'dompurify';

// Import types from the new API route locations
import { type AnalyzeChessGameOutput } from '@/app/api/ai/analyze-chess-game/route';
import { type GenerateImprovementTipsOutput } from '@/app/api/ai/generate-improvement-tips/route';
import { type FetchGameHistoryOutput, type FetchGameHistoryInput } from '@/app/api/ai/fetch-game-history/route';


const pgnImportSchema = z.object({
  pgn: z.string().min(10, { message: "PGN data seems too short." }).max(30000, { message: "PGN data is too long (max 30k chars)." }),
});

const usernameImportSchema = z.object({
  platform: z.enum(["lichess", "chesscom", "chess24"], { required_error: "Please select a platform." }),
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
});

type PgnImportFormValues = z.infer<typeof pgnImportSchema>;
type UsernameImportFormValues = z.infer<typeof usernameImportSchema>;

export default function AnalysisPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeChessGameOutput | null>(null);
  const [improvementTips, setImprovementTips] = useState<GenerateImprovementTipsOutput | null>(null);
  const [activeTab, setActiveTab] = useState<"username" | "pgn">("username");

  const pgnForm = useForm<PgnImportFormValues>({
    resolver: zodResolver(pgnImportSchema),
    defaultValues: { pgn: "" },
  });

  const usernameForm = useForm<UsernameImportFormValues>({
    resolver: zodResolver(usernameImportSchema),
  });

  const processAnalysis = async (pgnData: string, source: string) => {
    if (!pgnData || pgnData.trim().length < 10) {
      toast({ title: "Invalid PGN", description: "The PGN data is empty or too short to analyze.", variant: "destructive"});
      setAnalysisResult(null);
      setImprovementTips(null);
      return;
    }
    try {
      // Call the new API route for analyzeChessGame
      const analysisResponse = await fetch('/api/ai/analyze-chess-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: pgnData }),
      });
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({ error: 'Analysis request failed with status ' + analysisResponse.status }));
        throw new Error(errorData.error || 'Failed to analyze game');
      }
      const analysis: AnalyzeChessGameOutput = await analysisResponse.json();
      setAnalysisResult(analysis);
      toast({ title: `Game from ${source} Analyzed`, description: "Stockfish analysis complete.", variant: "default" });

      if (analysis?.analysis) {
        // Call the new API route for generateImprovementTips
        const tipsResponse = await fetch('/api/ai/generate-improvement-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameAnalysis: analysis.analysis }),
        });
        if (!tipsResponse.ok) {
          const errorData = await tipsResponse.json().catch(() => ({ error: 'Tips generation request failed with status ' + tipsResponse.status }));
          throw new Error(errorData.error || 'Failed to generate tips');
        }
        const tips: GenerateImprovementTipsOutput = await tipsResponse.json();
        setImprovementTips(tips);
        toast({ title: "Tips Generated", description: "Improvement suggestions are ready.", variant: "default" });
      }
    } catch (error) {
      console.error(`Error analyzing game from ${source}:`, error);
      toast({ title: "Analysis Error", description: `Could not analyze the game from ${source}. ` + (error instanceof Error ? error.message : String(error)), variant: "destructive" });
      setAnalysisResult(null);
      setImprovementTips(null);
    }
  };

  const handlePgnSubmit: SubmitHandler<PgnImportFormValues> = async (data) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setImprovementTips(null);
    await processAnalysis(data.pgn, "PGN Upload");
    setIsLoading(false);
  };

  const handleUsernameSubmit: SubmitHandler<UsernameImportFormValues> = async (data) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setImprovementTips(null);
    try {
      toast({ title: "Fetching Games...", description: `Attempting to fetch games for ${data.username} from ${data.platform}.`, variant: "default"});

      // Call the new API route for fetchGameHistory
      const historyInput: FetchGameHistoryInput = {
        platform: data.platform as "lichess" | "chesscom" | "chess24",
        username: data.username,
        maxGames: 1
      };
      const historyResponse = await fetch('/api/ai/fetch-game-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyInput),
      });

      if (!historyResponse.ok) {
        const errorData = await historyResponse.json().catch(() => ({ error: 'Fetch game history request failed with status ' + historyResponse.status }));
        throw new Error(errorData.error || 'Failed to fetch game history');
      }
      const historyOutput: FetchGameHistoryOutput = await historyResponse.json();

      if (historyOutput.games && historyOutput.games.length > 0) {
        toast({ title: "Games Fetched!", description: `Found ${historyOutput.games.length} game(s). Analyzing the latest one.`, variant: "default"});
        await processAnalysis(historyOutput.games[0], `${data.platform} (${data.username})`);
      } else {
        toast({ title: "No Games Found", description: `No games found for ${data.username} on ${data.platform}, or the platform integration is pending. Ensure username is correct and games are public.`, variant: "default" });
      }
    } catch (error) {
      console.error("Error fetching/analyzing game history:", error);
      toast({ title: "Import Error", description: "Could not fetch or analyze game history. " + (error instanceof Error ? error.message : String(error)), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageTitle title="Game Analysis" subtitle="Import games and get Stockfish-powered insights" icon={<BarChartHorizontalBig size={32} className="text-primary"/>} />

      <Tabs defaultValue="username" onValueChange={(value) => setActiveTab(value as "username" | "pgn")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-muted/30 border border-border/30 backdrop-blur-sm">
          <TabsTrigger value="username">Import by Username</TabsTrigger>
          <TabsTrigger value="pgn">Upload PGN</TabsTrigger>
        </TabsList>
        <TabsContent value="username">
          <Card glass className="p-6 animate-fade-in">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl">Import from Lichess.org</CardTitle>
              <CardDescription>Enter your username to import your latest game. (Chess.com/24 coming soon)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)} className="space-y-6">
                  <FormField
                    control={usernameForm.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-border/50">
                              <SelectValue placeholder="Select a platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover/80 backdrop-blur-md border-border/50">
                            <SelectItem value="lichess">Lichess.org</SelectItem>
                            <SelectItem value="chesscom" disabled>Chess.com (Coming Soon)</SelectItem>
                            <SelectItem value="chess24" disabled>Chess24 (Coming Soon)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={usernameForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., MagnusCarlsen" {...field} className="bg-background/50 border-border/50"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading && activeTab === "username" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserSearch className="mr-2 h-4 w-4" />}
                    Import & Analyze Latest Game
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pgn">
          <Card glass className="p-6 animate-fade-in">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl">Upload PGN</CardTitle>
              <CardDescription>Paste your game data in PGN format below.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Form {...pgnForm}>
                <form onSubmit={pgnForm.handleSubmit(handlePgnSubmit)} className="space-y-6">
                  <FormField
                    control={pgnForm.control}
                    name="pgn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PGN Data</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="[Event 'Rated Blitz game']..."
                            className="min-h-[200px] font-code text-sm bg-background/50 border-border/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading && activeTab === "pgn" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Analyze PGN
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && (
        <div className="flex flex-col items-center justify-center text-center p-8 space-y-2 mt-8 animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Processing your request...</p>
          <p className="text-muted-foreground">Analyzing game with Stockfish. This might take a few moments.</p>
        </div>
      )}

      {analysisResult && !isLoading && (
        <Card glass className="p-6 mt-8 animate-fade-in">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><CheckCircle className="text-green-400" /> Game Analysis Complete</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="single" collapsible defaultValue="analysis" className="w-full">
              <AccordionItem value="analysis" className="border-b-0">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">Detailed Stockfish Analysis</AccordionTrigger>
                <AccordionContent className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap p-4 bg-background/30 rounded-md font-code text-sm">
                  {analysisResult.analysis || "No detailed analysis content."}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {improvementTips && improvementTips.tips.length > 0 && !isLoading && (
        <Card glass className="p-6 mt-8 animate-fade-in">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><Lightbulb className="text-yellow-300" /> Improvement Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="space-y-3">
              {improvementTips.tips.map((tip, index) => {
                const sanitizedHtml = DOMPurify.sanitize(
                  tip.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${text} <span role="img" aria-label="external link" class="inline-block align-middle"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link h-3 w-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span></a>`)
                );
                return (
                  <li key={index} className="p-4 bg-background/30 rounded-lg border border-white/10 shadow-sm">
                    <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }}></span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {!isLoading && !analysisResult && !improvementTips && (
         <Card glass className="p-8 mt-8 text-center animate-fade-in">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No Analysis Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Import a game by username or upload PGN to see analysis and suggestions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
