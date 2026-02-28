
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Check, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordCardProps {
  word: string;
  pos: string;
  meaning: string;
  level: string;
  onResult: (result: 'easy' | 'good' | 'hard') => void;
}

export function WordCard({ word, pos, meaning, level, onResult }: WordCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // Auto-play audio on show? Maybe better on click.
  const playAudio = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    setRevealed(false);
    setFlipped(false);
    // playAudio(); // Optional: Auto-play
  }, [word]);

  return (
    <div className="perspective-1000 w-full max-w-md mx-auto h-96 relative">
      <div 
        className={cn(
          "w-full h-full transition-all duration-500 transform preserve-3d cursor-pointer relative",
          flipped ? "rotate-y-180" : ""
        )}
        onClick={() => setFlipped(!flipped)}
      >
        {/* Front */}
        <Card className="absolute w-full h-full backface-hidden flex flex-col items-center justify-center p-8 bg-white border-4 border-primary/20 shadow-xl rounded-3xl">
          <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground bg-secondary/20 px-2 py-1 rounded-full">
            {level}
          </div>
          
          <h2 className="text-5xl font-black text-primary mb-4 tracking-tight">{word}</h2>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full w-12 h-12 hover:bg-primary/10 text-primary"
            onClick={playAudio}
          >
            <Volume2 className="w-8 h-8" />
          </Button>

          <p className="mt-8 text-muted-foreground text-sm font-medium animate-pulse">
            Click to flip
          </p>
        </Card>

        {/* Back */}
        <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 bg-sky-50 border-4 border-secondary/20 shadow-xl rounded-3xl">
          <h2 className="text-3xl font-bold text-secondary mb-2">{word}</h2>
          <div className="text-lg text-muted-foreground mb-6 italic">{pos}</div>
          
          <div className="text-4xl font-bold text-foreground mb-8 text-center leading-relaxed">
            {meaning}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full mt-auto" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="destructive" 
              className="flex flex-col h-20 rounded-2xl gap-2 hover:scale-105 transition-transform"
              onClick={() => onResult('hard')}
            >
              <X className="w-6 h-6" />
              <span className="text-xs font-bold">Hard</span>
            </Button>
            
            <Button 
              className="flex flex-col h-20 rounded-2xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-transform"
              onClick={() => onResult('good')}
            >
              <Check className="w-6 h-6" />
              <span className="text-xs font-bold">Good</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col h-20 rounded-2xl gap-2 border-primary text-primary hover:bg-primary/10 hover:scale-105 transition-transform"
              onClick={() => onResult('easy')}
            >
              <Star className="w-6 h-6" />
              <span className="text-xs font-bold">Easy</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
