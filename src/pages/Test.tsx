
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVocabulary, type Word } from "@/hooks/useVocabulary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ChevronLeft, Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Test() {
  const [, setLocation] = useLocation();
  const { allBooks, progress, planState, recordTestResult } = useVocabulary();
  
  const allWords = allBooks.flatMap(b => b.words.map(w => ({...w, bookId: b.id})));
  
  // Helper to get pool
  const getQuizPool = (range: string, bookId?: string) => {
    let pool = allWords;
    if (bookId) pool = pool.filter(w => w.bookId === bookId);
    
    if (range === 'all-learned') {
       pool = pool.filter(w => progress[w.word]?.status && progress[w.word].status !== 'new');
    } else if (range === 'today-learned') {
       // Approximate via lastReview today
       const todayStart = new Date().setHours(0,0,0,0);
       pool = pool.filter(w => progress[w.word]?.lastReview >= todayStart);
    } else if (range === 'all-mistakes') {
       pool = pool.filter(w => (progress[w.word]?.errorCount || 0) > 0);
    } else if (range === 'today-mistakes') {
       // Filter from planState.todayMistakes
       pool = pool.filter(w => planState.todayMistakes.includes(w.word));
    }
    return pool;
  };
  
  const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup');
  const [config, setConfig] = useState({
    range: 'all-learned',
    bookId: 'all',    
    count: 10,
  });
  
  // TTS Helper
  const playTTS = (text: string) => {
    const u = new SpeechSynthesisUtterance(text); 
    u.lang = 'en-US'; 
    u.rate = 0.8;
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
  
  const [quizData, setQuizData] = useState<{
    question: Word;
    options: Word[];
    correctIndex: number;
  }[]>([]);
  
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Derived state for current question to allow top-level hooks
  const current = step === 'quiz' ? quizData[currentQ] : null;

  // Auto-play question audio
  useEffect(() => {
    if (step === 'quiz' && current?.question) {
        playAudio(current.question.word, current.question.audioUrl);
    }
  }, [step, current]);

  const startQuiz = () => {
    let pool = getQuizPool(config.range, config.bookId === 'all' ? undefined : config.bookId);
      
    if (pool.length < 4) {
      alert(`Not enough words found! (${pool.length}). Minimum 4 words required.`);
      return;
    }
    
    pool = [...pool].sort(() => Math.random() - 0.5);
    const questions = pool.slice(0, Math.min(config.count, pool.length));
    
    const qData = questions.map(q => {
      const distractors = allWords.filter(w => w.word !== q.word).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [q, ...distractors].sort(() => Math.random() - 0.5);
      return { question: q, options, correctIndex: options.indexOf(q) };
    });
    
    setQuizData(qData); setStep('quiz'); setCurrentQ(0); setScore(0);
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    const correct = index === quizData[currentQ].correctIndex;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    
    // Record Result
    recordTestResult(quizData[currentQ].question.word, correct);
    
    setTimeout(() => {
      if (currentQ < quizData.length - 1) {
        setCurrentQ(q => q + 1); setSelectedOption(null); setIsCorrect(null);
      } else { setStep('result'); }
    }, 1200);
  };

  if (step === 'setup') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col items-center justify-center max-w-md mx-auto bg-background overflow-hidden">
        <div className="w-full mb-6 flex items-center gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/')}><ChevronLeft /></Button>
            <div className="flex flex-col">
                <h1 className="text-3xl font-black text-primary leading-none">Quiz Setup</h1>
                <span className="text-sm font-bold text-muted-foreground opacity-70">测试设置</span>
            </div>
        </div>
        
        <div className="flex-1 w-full overflow-y-auto pb-6">
          <Card className="w-full p-6 space-y-6 shadow-xl border-2">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                  <div className="flex items-baseline gap-2"><Label className="font-bold text-lg">Quiz Range</Label><span className="text-xs text-muted-foreground">测试范围</span></div>
              </div>
              <RadioGroup value={config.range} onValueChange={(v) => setConfig({...config, range: v})}>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10"><RadioGroupItem value="all-learned" id="all-learned" /><Label htmlFor="all-learned" className="flex-1 cursor-pointer">全部已学 <span className="text-xs text-muted-foreground ml-1">All Learned</span></Label></div>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10"><RadioGroupItem value="today-learned" id="today-learned" /><Label htmlFor="today-learned" className="flex-1 cursor-pointer">当天已学 <span className="text-xs text-muted-foreground ml-1">Today's</span></Label></div>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10"><RadioGroupItem value="book" id="book-range" /><Label htmlFor="book-range" className="flex-1 cursor-pointer">指定单词本 <span className="text-xs text-muted-foreground ml-1">Specific Book</span></Label></div>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10"><RadioGroupItem value="all-mistakes" id="all-mistakes" /><Label htmlFor="all-mistakes" className="flex-1 cursor-pointer">全部错题 <span className="text-xs text-muted-foreground ml-1">All Errors</span></Label></div>
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/10"><RadioGroupItem value="today-mistakes" id="today-mistakes" /><Label htmlFor="today-mistakes" className="flex-1 cursor-pointer">当天错题 <span className="text-xs text-muted-foreground ml-1">Today's Errors</span></Label></div>
              </RadioGroup>
            </div>

            {config.range === 'book' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label>Select Book / 选择词书</Label>
                <Select value={config.bookId} onValueChange={(v) => setConfig({...config, bookId: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Book (所有词书)</SelectItem>
                    {allBooks.map(b => (<SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                  <div className="flex items-baseline gap-2"><Label className="font-bold">Question Count</Label><span className="text-xs text-muted-foreground">题目数量</span></div>
              </div>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map(num => (
                  <Button key={num} variant={config.count === num ? "default" : "outline"} size="sm" onClick={() => setConfig({...config, count: num})} className="flex-1 rounded-xl">
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full h-14 text-xl font-black rounded-2xl shadow-lg shadow-primary/20 flex flex-col items-center justify-center leading-none" onClick={startQuiz}>
              <span>Start Quiz</span>
              <span className="text-xs font-medium opacity-80 mt-1">开始测试</span>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div className="min-h-[100dvh] p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center bg-background">
        <h1 className="text-4xl font-black text-primary mb-1">Results</h1><p className="text-lg font-bold text-primary/60 mb-4">测试结果</p>
        <div className="text-7xl font-black text-accent mb-8">{score} / {quizData.length}</div>
        <div className="bg-white p-6 rounded-3xl w-full mb-8 shadow-inner border-2 border-dashed border-gray-200">
            <p className="text-muted-foreground font-bold">
                {score === quizData.length ? <span>🌟 Perfect! You are a genius!<br/><span className="text-sm font-normal opacity-70">全对！你是天才！</span></span> : <span>💪 Good effort! Keep practicing!<br/><span className="text-sm font-normal opacity-70">加油！继续练习！</span></span>}
            </p>
        </div>
        <div className="space-y-4 w-full">
          <Button className="w-full h-14 text-xl font-bold rounded-2xl flex flex-col items-center justify-center leading-none" onClick={() => setStep('setup')}>
            <span>New Quiz</span>
            <span className="text-xs font-medium opacity-70 mt-1">再测一次</span>
          </Button>
          <Button variant="outline" className="w-full h-14 text-xl font-bold rounded-2xl flex flex-col items-center justify-center leading-none" onClick={() => setLocation('/')}>
            <span>Back Home</span>
            <span className="text-xs font-medium opacity-50 mt-1">返回首页</span>
          </Button>
        </div>
      </div>
    );
  }

  // current is already defined at top level
  if (!current) return null; // Should not happen if step is quiz

  const progressPercent = ((currentQ) / quizData.length) * 100;

  return (
    <div className="min-h-[100dvh] p-4 flex flex-col max-w-md mx-auto bg-background overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0 pt-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')} className="rounded-full">Exit</Button>
        <div className="font-black text-muted-foreground bg-gray-100 px-3 py-1 rounded-full text-xs">
            QUIZ: {currentQ + 1} OF {quizData.length}
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-3 rounded-full mb-6 bg-secondary/10 shrink-0" />
      
      <div className="flex-1 flex flex-col justify-center overflow-y-auto min-h-0">
        <div className="text-center mb-6 shrink-0">
          <h2 className="text-5xl font-black text-primary mb-2 tracking-tight leading-tight">{current.question.word}</h2>
          {current.question.phonetic && <div className="text-lg text-muted-foreground font-mono mb-4 bg-gray-50 px-3 py-1 rounded-full inline-block">{current.question.phonetic}</div>}
          <div className="flex justify-center mb-4">
            <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 bg-primary/5 text-primary" onClick={() => playAudio(current.question.word, current.question.audioUrl)}>
               <Volume2 className="w-8 h-8" />
            </Button>
          </div>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs opacity-50">{current.question.pos}</p>
        </div>
        
        <div className="space-y-3 pb-6">
          {current.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrectOption = idx === current.correctIndex;
            let bgClass = "hover:scale-[1.02] transition-transform duration-200 border-2";
            if (selectedOption !== null) {
              if (isCorrectOption) bgClass = "bg-green-500 text-white border-green-500 scale-[1.02] shadow-lg shadow-green-100";
              else if (isSelected) bgClass = "bg-red-500 text-white border-red-500 shadow-lg shadow-red-100";
              else bgClass = "opacity-30 border-gray-100";
            }
            return (
              <Button key={idx} variant="outline" className={`w-full h-16 sm:h-20 text-base sm:text-lg font-bold rounded-3xl whitespace-normal leading-tight px-6 ${bgClass}`} onClick={() => handleAnswer(idx)} disabled={selectedOption !== null}>
                <span className="line-clamp-2">{opt.meaning}</span>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-2 flex flex-col items-center justify-center space-y-4 min-h-[4rem] shrink-0">
          {isCorrect === true && <div className="text-green-600 font-black flex items-center gap-2 animate-bounce"><CheckCircle2 /> CORRECT! / 回答正确</div>}
          {isCorrect === false && <div className="text-red-500 font-black flex items-center gap-2 animate-shake"><XCircle /> INCORRECT / 回答错误</div>}
          
          {selectedOption !== null && current.question.example && (
             <div className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full bg-primary/10 text-primary mt-0.5" onClick={() => playAudio(current.question.example!, current.question.exampleAudioUrl)}>
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </Button>
                <div className="text-left">
                    <p className="text-sm font-medium text-gray-800 leading-tight">"{current.question.example}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Example</p>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
