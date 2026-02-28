
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Crown, Info, CloudOff, Cloud, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { fetchLeaderboard, syncScore, type LeaderboardEntry } from "@/services/api";

import red from "@/assets/avatars/red.png";
import blue from "@/assets/avatars/blue.png";
import yellow from "@/assets/avatars/yellow.png";
import black from "@/assets/avatars/black.png";
import white from "@/assets/avatars/white.png";
import green from "@/assets/avatars/green.png";

const AVATARS: Record<string, string> = { red, blue, yellow, black, white, green };

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { user, users } = useAuth(); 
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Calculate local score
  const getLocalScore = (userId: string) => {
        const progressKey = `kids_vocab_progress_v5_${userId}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
            const pMap = JSON.parse(savedProgress);
            return Object.values(pMap).filter((p: any) => p.status !== 'new').length;
        }
        return 0;
  };

  const loadData = async () => {
      setLoading(true);
      try {
          // 1. Sync current user score first
          if (user) {
              const score = getLocalScore(user.id);
              await syncScore({
                  id: user.id,
                  username: user.username,
                  avatarId: user.avatarId,
                  avatarColor: user.avatarColor,
                  score
              });
          }

          // 2. Fetch Global Leaderboard
          const globalData = await fetchLeaderboard();
          if (globalData.length > 0) {
              setLeaderboard(globalData);
              setIsOffline(false);
          } else {
              throw new Error("Empty data");
          }
      } catch (e) {
          console.log("Server unreachable, falling back to local + bots");
          setIsOffline(true);
          
          // Fallback: Local Users + Bots
          const localUsers = users.filter(u => !u.isAdmin).map(u => ({
              id: u.id,
              username: u.username,
              avatarId: u.avatarId,
              avatarColor: u.avatarColor,
              score: getLocalScore(u.id)
          }));
          
          // Add Bots if few users
          const bots: LeaderboardEntry[] = [
            { id: 'bot_1', username: 'Alex', avatarId: 'blue', avatarColor: '#219EBC', score: 120 },
            { id: 'bot_2', username: 'Sarah', avatarId: 'red', avatarColor: '#FF595E', score: 85 },
            { id: 'bot_3', username: 'Tom', avatarId: 'green', avatarColor: '#8AC926', score: 45 },
            { id: 'bot_4', username: 'Lily', avatarId: 'yellow', avatarColor: '#FFCA3A', score: 30 },
          ];
          
          setLeaderboard([...localUsers, ...bots].sort((a, b) => b.score - a.score));
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [user]);

  return (
    <div className="min-h-screen p-4 bg-background max-w-md mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>Back</Button>
        <h1 className="text-xl font-black text-primary flex items-center gap-2">
          <Trophy className="fill-current" /> Leaderboard
        </h1>
        <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
        </Button>
      </div>

      <div className={cn(
          "mb-4 p-3 text-xs rounded-xl border flex gap-2 items-center justify-between",
          isOffline ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-green-50 text-green-700 border-green-100"
      )}>
          <div className="flex gap-2 items-center">
            {isOffline ? <CloudOff className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
            <span className="font-bold">{isOffline ? "Offline Mode (Local + Bots)" : "Online Global Ranking"}</span>
          </div>
          <span className="opacity-70 text-[10px]">{isOffline ? "Server Unreachable" : "Live Updated"}</span>
      </div>

      <Card className="flex-1 bg-white/50 backdrop-blur border-4 border-primary/10 overflow-hidden flex flex-col">
        <div className="bg-primary/10 p-4 border-b border-primary/10 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Words Learned</span>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {leaderboard.map((entry, index) => {
            const isMe = entry.id === user?.id;
            const rank = index + 1;
            const avatarSrc = entry.avatarId && AVATARS[entry.avatarId] ? AVATARS[entry.avatarId] : null;
            
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
                          (entry.username && entry.username[0]) ? entry.username[0].toUpperCase() : '?'
                      )}
                    </div>
                    <div>
                      <div className={cn("font-bold text-sm flex items-center gap-1", isMe ? "text-white" : "text-gray-900")}>
                        {entry.username} {isMe && "(You)"}
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

          {leaderboard.length === 0 && !loading && (
            <div className="text-center p-8 text-muted-foreground">
              No players yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
