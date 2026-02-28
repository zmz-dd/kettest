
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVocabulary, type Word } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Volume2, ArrowRight, X, Check, SkipForward, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function Learn() {
  const [location, setLocation] = useLocation();
  const { getTodayTask, recordLearnResult, stats, fetchRawNewWords } = useVocabulary();
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [step, setStep] = useState<'reveal' | 'feedback'>('reveal');
  const [isBonusSession, setIsBonusSession] = useState(false);
  
  // Load words
  // Logic: "Load all words for the day". 
  // If I already learned 10, and goal is 20, load 10.
  // If I quit and resume, load remaining.
  useEffect(() => {
      // If we already have a active queue, do not reset it
      if (queue.length > 0) return;

      const task = getTodayTask();
      if (task.length > 0) {
          setQueue(task);
          setCurrentIndex(0);
          setSessionComplete(false);
      } else {
          // Check if data is actually loaded (plan exists) before deciding we are done
          // stats might be null initially
          if (stats) {
             if (!isBonusSession && stats.todayLearned >= stats.dailyGoal) {
                 setSessionComplete(true);
             } else if (stats.remaining === 0) {
                 setSessionComplete(true);
             }
          }
      }
  }, [getTodayTask, stats, isBonusSession, queue.length]);

  const handleAppend = () => {
        const newWords = fetchRawNewWords(10); 
        if (newWords.length > 0) { 
            setIsBonusSession(true);
            setQueue(newWords); 
            setCurrentIndex(0); 
            setSessionComplete(false); 
        } else { 
            toast.info("No more new words available!"); 
            setLocation('/'); 
        }
  };
  
  const currentWord = queue[currentIndex];
  
  const playAudio = (text: string, url?: string) => {
    if (url && url !== '') {
        const audio = new Audio(url);
        audio.play().catch(() => playTTS(text));
    } else {
        playTTS(text);
    }
  };
  
  const playTTS = (text: string) => {
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'en-US'; 
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => { 
    if (currentWord) { 
        playAudio(currentWord.word, currentWord.audioUrl); 
        setStep('reveal'); 
    } else if (queue.length > 0 && currentIndex >= queue.length) {
        setSessionComplete(true);
    }
  }, [currentWord, currentIndex, queue.length]);

  const handleReveal = () => {
    setStep('feedback');
  };

  const handleFeedback = (type: 'know' | 'dont-know') => {
    recordLearnResult(currentWord.word, type);
    // Auto advance
    if (currentIndex < queue.length - 1) { 
        setCurrentIndex(prev => prev + 1); 
        setStep('reveal');
    } else { 
        setSessionComplete(true); 
    }
  };

  if (sessionComplete) {
    const todayCount = stats?.todayLearned || 0;
    
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 bg-background animate-in fade-in duration-500 overflow-hidden">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-primary text-center max-w-md w-full">
          <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-primary mb-2">Great Job!</h1><p className="text-lg font-bold text-primary/70 mb-1">太棒了！</p>
          <p className="text-muted-foreground mb-4 font-bold">
              Today you learned <span className="text-2xl text-accent">{todayCount}</span> words!
              <br/><span className="text-sm font-normal opacity-80">今日已学 {todayCount} 个单词</span>
          </p>
          
          <div className="space-y-4">
            <Button className="w-full h-16 text-xl font-black rounded-2xl bg-secondary hover:bg-secondary/90 shadow-lg shadow-blue-100 flex flex-col items-center justify-center leading-none" onClick={handleAppend}>
                <span>Append 10 Words</span>
                <span className="text-[10px] opacity-70">追加学习 (10个)</span>
            </Button>
            <Button variant="outline" className="w-full h-16 text-xl font-bold rounded-2xl border-2 flex flex-col items-center justify-center leading-none" onClick={() => setLocation('/')}>
                <span>Finish Today</span>
                <span className="text-[10px] opacity-50">结束今日学习</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!currentWord && !sessionComplete) return <div className="min-h-[100dvh] flex items-center justify-center font-black animate-pulse">Loading task...</div>;
  
  const dailyProgress = stats ? Math.min(100, (stats.todayLearned / stats.dailyGoal) * 100) : 0;

  return (
    <div className="min-h-[100dvh] flex flex-col p-4 bg-background max-w-md mx-auto relative overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0 pt-2 px-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')}><ChevronLeft /></Button>
        <div className="text-[10px] font-black text-muted-foreground bg-white px-4 py-1 rounded-full shadow-sm border uppercase tracking-widest">
            Today: {stats?.todayLearned} / {stats?.dailyGoal}
        </div>
        <div className="w-10" />
      </div>
      <Progress value={dailyProgress} className="h-3 rounded-full mb-4 bg-secondary/10 mx-2 shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center mb-6 min-h-0">
        <Card className="w-full flex-1 max-h-[65vh] flex flex-col items-center justify-center p-6 sm:p-10 shadow-2xl border-none relative bg-white rounded-[3rem] overflow-hidden">
          <div className="absolute top-6 left-8 text-[10px] font-black text-primary/30 uppercase tracking-tighter max-w-[150px] truncate">
            {currentWord?.level}
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full overflow-y-auto">
            <h2 className="text-5xl sm:text-6xl font-black text-primary mb-2 text-center tracking-tight break-words max-w-full leading-none">{currentWord?.word}</h2>
            {currentWord?.phonetic && <div className="text-lg text-muted-foreground font-mono mb-4 bg-gray-50 px-3 py-1 rounded-full">{currentWord.phonetic}</div>}
            
            <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 mb-6 text-primary bg-primary/5 hover:bg-primary/10 transition-colors shrink-0" onClick={() => playAudio(currentWord!.word, currentWord?.audioUrl)}>
              <Volume2 className="w-8 h-8" />
            </Button>

            {step === 'feedback' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 text-center w-full space-y-4">
                <div className="bg-sky-50 p-6 rounded-[2rem] border-2 border-sky-100 shadow-inner">
                    <p className="text-xl text-secondary font-black mb-1 opacity-50 uppercase text-[10px] tracking-widest">{currentWord?.pos || 'unknown'}</p>
                    <p className="text-2xl sm:text-3xl text-foreground font-black leading-tight">{currentWord?.meaning || 'Thinking...'}</p>
                </div>
                
                {currentWord?.example && (
                    <div className="w-full flex flex-col gap-2">
                        <div className="flex items-start gap-3 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary mt-1"
                                onClick={(e) => { e.stopPropagation(); playAudio(currentWord.example!, currentWord.exampleAudioUrl); }}
                            >
                                <Volume2 className="w-4 h-4" />
                            </Button>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 font-medium leading-relaxed">"{currentWord.example}"</p>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="w-full pb-6 px-2 shrink-0">
        {step === 'reveal' ? (
             <Button className="w-full h-20 text-2xl font-black rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground border-b-8 border-yellow-600 shadow-xl active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center leading-none" onClick={handleReveal}>
                <div className="flex items-center gap-2">
                    <span>VIEW MEANING</span>
                    <ArrowRight className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium opacity-80 mt-1">查看释义</span>
             </Button>
        ) : (
            <div className="grid grid-cols-2 gap-4">
            <Button className="h-20 flex flex-col gap-0 rounded-3xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-100 transition-all active:scale-95" onClick={() => handleFeedback('dont-know')}>
              <X className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-black uppercase leading-none">Don't Know</span>
              <span className="text-[9px] font-medium leading-none mt-0.5">不认识</span>
            </Button>
            <Button className="h-20 flex flex-col gap-0 rounded-3xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-100 transition-all active:scale-95" onClick={() => handleFeedback('know')}>
              <Check className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-black uppercase leading-none">Know</span>
              <span className="text-[9px] font-medium leading-none mt-0.5">认识</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );


}
