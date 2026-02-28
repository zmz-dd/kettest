
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVocabulary, type Word } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ChevronLeft, Volume2, BookOpen, BrainCircuit } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function Review() {
  const [, setLocation] = useLocation();
  const { allBooks, progress, getReviewTask, getStageLabel, recordReviewResult } = useVocabulary();
  
  // Reconstruct all learned words from progress map
  // We need to find the word details from allBooks
  const allLearnedWords = allBooks.flatMap(b => b.words.map(w => ({...w, bookId: b.id})))
      .filter(w => progress[w.word] && progress[w.word].status !== 'new');

  const reviewTask = getReviewTask('today');

  const playTTS = (text: string) => {
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };
  
  const playAudio = (text: string, url?: string) => {
    if (url && url !== '') {
        const audio = new Audio(url);
        audio.play().catch(() => playTTS(text));
    } else {
        playTTS(text);
    }
  };

  return (
    <div className="min-h-[100dvh] p-4 flex flex-col max-w-md mx-auto bg-green-50/30 overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0 pt-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/')}><ChevronLeft /></Button>
        <h1 className="font-black text-green-700 tracking-tight">Review Center</h1>
        <div className="w-10" />
      </div>
      
      <Tabs defaultValue="task" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white/50 p-1 rounded-2xl mb-4 shadow-sm border border-white shrink-0">
              <TabsTrigger value="task" className="rounded-xl font-bold text-xs">Scientific Review ({reviewTask.length})</TabsTrigger>
              <TabsTrigger value="list" className="rounded-xl font-bold text-xs">All Learned ({allLearnedWords.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="flex-1 flex flex-col mt-0 min-h-0 overflow-hidden">
              {reviewTask.length > 0 ? (
                  <ReviewQuizSession task={reviewTask} onComplete={() => setLocation('/')} />
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-200 mx-2">
                      <CheckCircle2 className="w-20 h-20 text-green-400 mb-6" />
                      <h2 className="text-2xl font-black text-gray-400">All Clear!</h2>
                      <p className="text-muted-foreground font-medium">No reviews due right now.</p>
                  </div>
              )}
          </TabsContent>

          <TabsContent value="list" className="flex-1 mt-0 overflow-hidden flex flex-col min-h-0">
              <div className="bg-white/50 p-4 rounded-t-3xl border-b border-white/20 flex items-center justify-between shrink-0">
                  <span className="font-bold text-green-700 flex items-center gap-2"><BookOpen className="w-4 h-4"/> Vocabulary List</span>
                  <span className="text-xs text-muted-foreground">Progress Stage</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {allLearnedWords.map((w, i) => (
                      <div key={i} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm border border-green-50">
                          <div className="flex flex-col flex-1 mr-4">
                              <div className="flex items-center gap-2">
                                <div className="font-black text-lg">{w.word}</div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/50 hover:text-primary rounded-full" onClick={() => playAudio(w.word, w.audioUrl)}>
                                    <Volume2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-sm text-muted-foreground truncate">{w.meaning}</div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                              <div className="bg-green-100 text-green-700 font-black text-[10px] px-2 py-1 rounded-md mb-1 uppercase">
                                  {getStageLabel(progress[w.word]?.stage || 0)}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewQuizSession({ task, onComplete }: { task: Word[], onComplete: () => void }) {
    const { allBooks, recordReviewResult } = useVocabulary();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [options, setOptions] = useState<Word[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const allWords = allBooks.flatMap(b => b.words); // Pool for distractors

    const currentWord = task[currentIndex];

    // Generate options when index changes
    useEffect(() => {
        if (!currentWord) return;
        const distractors = allWords.filter(w => w.word !== currentWord.word)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        const opts = [currentWord, ...distractors].sort(() => Math.random() - 0.5);
        setOptions(opts);
        setSelectedOption(null);
        setIsCorrect(null);
        
        // Auto play audio
        const playTTS = (text: string) => {
            const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.8;
            window.speechSynthesis.speak(u);
        };
        if (currentWord.audioUrl) {
            new Audio(currentWord.audioUrl).play().catch(() => playTTS(currentWord.word));
        } else {
            playTTS(currentWord.word);
        }

    }, [currentIndex, currentWord]);

    const handleAnswer = (index: number) => {
        if (selectedOption !== null) return;
        setSelectedOption(index);
        const correct = options[index].word === currentWord.word;
        setIsCorrect(correct);
        
        // Record result
        recordReviewResult(currentWord.word, correct ? 'know' : 'dont-know', 'today');

        setTimeout(() => {
            if (currentIndex < task.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onComplete();
            }
        }, 1000);
    };

    if (!currentWord) return null;

    const progressPercent = ((currentIndex) / task.length) * 100;

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <Progress value={progressPercent} className="h-2 rounded-full mb-6 bg-green-200 shrink-0 mx-2" />
            
            <div className="flex-1 flex flex-col justify-center items-center px-2 min-h-0">
                <Card className="w-full flex-1 max-h-[60vh] flex flex-col items-center justify-center p-6 shadow-xl border-none relative bg-white rounded-[2.5rem] mb-6">
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                        <h2 className="text-5xl font-black text-primary mb-2 text-center tracking-tight">{currentWord.word}</h2>
                        {currentWord.phonetic && <div className="text-lg text-muted-foreground font-mono mb-4 bg-gray-50 px-3 py-1 rounded-full">{currentWord.phonetic}</div>}
                        
                        <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 bg-primary/5 text-primary mb-2" onClick={() => {
                             const u = new SpeechSynthesisUtterance(currentWord.word); u.lang = 'en-US'; u.rate = 0.8;
                             if(currentWord.audioUrl) new Audio(currentWord.audioUrl).play().catch(()=>window.speechSynthesis.speak(u));
                             else window.speechSynthesis.speak(u);
                        }}>
                            <Volume2 className="w-8 h-8" />
                        </Button>
                    </div>
                </Card>

                <div className="w-full space-y-3 pb-6">
                    {options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isTarget = opt.word === currentWord.word;
                        
                        let bgClass = "hover:scale-[1.02] active:scale-95 transition-all duration-200 border-2 bg-white";
                        if (selectedOption !== null) {
                            if (isTarget) bgClass = "bg-green-500 text-white border-green-500 shadow-lg shadow-green-100 scale-[1.02]";
                            else if (isSelected) bgClass = "bg-red-500 text-white border-red-500 shadow-lg shadow-red-100";
                            else bgClass = "opacity-40 border-gray-100 bg-gray-50";
                        }

                        return (
                            <Button key={idx} variant="outline" className={`w-full h-16 text-lg font-bold rounded-2xl whitespace-normal leading-tight px-6 ${bgClass}`} onClick={() => handleAnswer(idx)} disabled={selectedOption !== null}>
                                {opt.meaning}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
