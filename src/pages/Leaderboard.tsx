
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

import red from "@/assets/avatars/red.png";
import blue from "@/assets/avatars/blue.png";
import yellow from "@/assets/avatars/yellow.png";
import black from "@/assets/avatars/black.png";
import white from "@/assets/avatars/white.png";
import green from "@/assets/avatars/green.png";

const AVATARS: Record<string, string> = { red, blue, yellow, black, white, green };

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { user, users } = useAuth(); // Auth context has users list

  // Calculate leaderboard here since it requires accessing other users' data
  // Requirement 2: Sort by "Cumulative Learned" (Unique words learned since registration)
  // Data is in localStorage keys: kids_vocab_progress_v5_{userId}
  
  const leaderboard = users
    .filter(u => !u.isAdmin) // Filter out admin
    .map(u => {
        const progressKey = `kids_vocab_progress_v5_${u.id}`;
        const savedProgress = localStorage.getItem(progressKey);
        let score = 0;
        
        if (savedProgress) {
            const pMap = JSON.parse(savedProgress);
            // Count entries where status != 'new'
            score = Object.values(pMap).filter((p: any) => p.status !== 'new').length;
        }
        
        return {
            id: u.id,
            username: u.username,
            avatarId: u.avatarId,
            avatarColor: u.avatarColor,
            score
        };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen p-4 bg-background max-w-md mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>Back</Button>
        <h1 className="text-xl font-black text-primary flex items-center gap-2">
          <Trophy className="fill-current" /> Leaderboard
        </h1>
        <div className="w-10" /> 
      </div>

      <Card className="flex-1 bg-white/50 backdrop-blur border-4 border-primary/10 overflow-hidden flex flex-col">
        <div className="bg-primary/10 p-4 border-b border-primary/10">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
            <span>Learned</span>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {leaderboard.map((entry, index) => {
            const isMe = entry.id === user?.id;
            const rank = index + 1;
            const avatarSrc = entry.avatarId ? AVATARS[entry.avatarId] : null;
            
            let rankIcon;
            if (rank === 1) rankIcon = <Crown className="w-5 h-5 text-yellow-500 fill-current" />;
            else if (rank === 2) rankIcon = <Medal className="w-5 h-5 text-gray-400 fill-current" />;
            else if (rank === 3) rankIcon = <Medal className="w-5 h-5 text-amber-600 fill-current" />;
            else rankIcon = <span className="text-muted-foreground font-bold w-5 text-center">{rank}</span>;

            return (
              <div 
                key={entry.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl transition-all",
                  isMe ? "bg-primary text-primary-foreground shadow-md transform scale-[1.02]" : "bg-white hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">{rankIcon}</div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm bg-white overflow-hidden border-2 border-white/50"
                      style={!avatarSrc ? { backgroundColor: entry.avatarColor } : {}}
                    >
                      {avatarSrc ? (
                          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          entry.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className={cn("font-bold text-sm", isMe ? "text-white" : "text-gray-900")}>
                        {entry.username} {isMe && "(You)"}
                      </div>
                      <div className={cn("text-xs", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        {entry.score} Words
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="font-black text-lg">
                  {entry.score}
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No players yet. Be the first!
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
