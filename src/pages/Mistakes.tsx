
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVocabulary } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Volume2, History, ChevronLeft, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Mistakes() {
  const [, setLocation] = useLocation();
  const { getMistakesList, progress } = useVocabulary();
  
  const [activeTab, setActiveTab] = useState('all');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const highFreq = getMistakesList('all'); // Rank should show ALL mistakes sorted by count
  const allMistakes = getMistakesList('all');
  const todayMistakes = getMistakesList('today');
  
  const playTTS = (text: string) => {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };
  
  const playAudio = (text: string, url?: string) => {
    if (url) new Audio(url).play().catch(() => playTTS(text));
    else playTTS(text);
  };

  return (
    <div className="min-h-[100dvh] p-4 flex flex-col max-w-md mx-auto bg-red-50/30 overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0 pt-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')}><ChevronLeft /></Button>
        <h1 className="font-black text-destructive tracking-tight">Mistakes Book</h1>
        <div className="w-10" />
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setReviewIndex(0); setShowMeaning(false); }} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-white/50 p-1 rounded-2xl mb-6 shadow-sm border border-white shrink-0">
              <TabsTrigger value="all" className="rounded-xl font-bold text-xs">All ({allMistakes.length})</TabsTrigger>
              <TabsTrigger value="today" className="rounded-xl font-bold text-xs">Today ({todayMistakes.length})</TabsTrigger>
              <TabsTrigger value="rank" className="rounded-xl font-bold text-xs">Rank ({highFreq.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
              <MistakesCardView mode="all" />
          </TabsContent>
          <TabsContent value="today" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
              <MistakesCardView mode="today" />
          </TabsContent>

          <TabsContent value="rank" className="flex-1 mt-0 overflow-hidden flex flex-col min-h-0">
              <div className="bg-white/50 p-4 rounded-t-3xl border-b border-white/20 flex items-center justify-between shrink-0">
                  <span className="font-bold text-destructive flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Error Rank</span>
                  <span className="text-xs text-muted-foreground">High to Low</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {highFreq.length === 0 ? (
                      <div className="text-center p-10 text-muted-foreground">No high frequency errors yet.</div>
                  ) : (
                      highFreq.map((w, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-red-50">
                              <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <div className="font-black text-lg">{w.word}</div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/50 hover:text-primary rounded-full" onClick={() => playAudio(w.word, w.audioUrl)}>
                                        <Volume2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono mb-0.5">{w.phonetic}</div>
                                  <div className="text-sm text-muted-foreground">{w.meaning}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                  <div className="bg-red-100 text-red-600 font-black text-xs px-2 py-1 rounded-md mb-1">
                                      {progress[w.word]?.errorCount}x
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );

  function MistakesCardView({ mode }: { mode: 'all' | 'today' }) {
      const mistakes = getMistakesList(mode);
      const current = mistakes[reviewIndex] || null;

      useEffect(() => {
        if (current) {
            playAudio(current.word, current.audioUrl);
        }
      }, [current]);

      if (!current) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-200 mx-2">
                <CheckCircle2 className="w-20 h-20 text-green-400 mb-6" />
                <h2 className="text-2xl font-black text-gray-400">Great!</h2>
                <p className="text-muted-foreground font-medium">No mistakes in this category.</p>
            </div>
          );
      }

      return (
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex-1 flex flex-col justify-center items-center px-2 min-h-0">
            <Card className="w-full flex-1 max-h-[65vh] flex flex-col items-center justify-center p-6 sm:p-10 shadow-2xl border-none relative bg-white rounded-[3rem] overflow-hidden transition-all duration-300">
              <div className="absolute top-6 left-8 text-[10px] font-black text-primary/30 uppercase tracking-tighter max-w-[150px] truncate">
                {current.bookId}
              </div>
              <div className="absolute top-6 right-8 flex flex-col items-end gap-1">
                 <div className="bg-destructive text-white text-[10px] px-3 py-1 rounded-full font-black flex items-center gap-1 shadow-md">
                    <History className="w-3 h-3" /> Errors: {progress[current.word]?.errorCount || 0}
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center w-full overflow-y-auto">
                <h2 className="text-5xl font-black text-primary mb-2 text-center tracking-tight leading-tight">{current.word}</h2>
                <div className="text-sm font-mono text-muted-foreground mb-8 bg-gray-50 px-3 py-1 rounded-full">{current.phonetic}</div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-4 tracking-widest">{current.pos}</p>
                
                <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 bg-primary/5 text-primary mb-10 shrink-0" onClick={() => playAudio(current.word, current.audioUrl)}>
                  <Volume2 className="w-8 h-8" />
                </Button>

                {showMeaning ? (
                  <div className="animate-in fade-in zoom-in duration-500 text-center space-y-6 px-2 w-full">
                    <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 shadow-inner">
                        <p className="text-2xl text-foreground font-black leading-tight">{current.meaning}</p>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="rounded-2xl border-2 border-primary/20 text-primary font-black px-10 h-14 hover:bg-primary/5 transition-all shrink-0" onClick={() => setShowMeaning(true)}>
                    TAP TO REVEAL
                  </Button>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-6 pb-6 px-2 shrink-0">
            <Button className="h-20 text-2xl font-black rounded-[2rem] bg-primary hover:bg-primary/90 shadow-xl shadow-yellow-100 text-primary-foreground border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all" onClick={() => { setShowMeaning(false); setReviewIndex((reviewIndex + 1) % mistakes.length); }}>
              NEXT WORD
            </Button>
          </div>
        </div>
      );
  }
}
