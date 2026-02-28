
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useVocabulary, type PlanSettings } from "@/hooks/useVocabulary";
import { useAuth } from "@/contexts/UserContext";
import { useTime } from "@/contexts/TimeContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon, BookOpen, Trophy, BarChart3, Play, XCircle, LogOut, Crown, BookPlus, PlusCircle, AlertTriangle, History, RefreshCcw, CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import mascot from "@/assets/mascot.png";
import { toast } from "sonner";

import red from "@/assets/avatars/red.png";
import yellow from "@/assets/avatars/yellow.png";
import blue from "@/assets/avatars/blue.png";
import black from "@/assets/avatars/black.png";
import green from "@/assets/avatars/green.png";
import white from "@/assets/avatars/white.png";

const AVATAR_MAP: Record<string, string> = { red, yellow, blue, black, green, white };

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { now, setSystemTime, resetSystemTime, isSimulated } = useTime();
  const { 
    plan,
    stats, 
    savePlan,
    allBooks,
    getReviewTask,
    getMistakesList
  } = useVocabulary();

  const [reviewCount, setReviewCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugDate, setDebugDate] = useState("");
  
  // Pending settings for dialog
  const [pendingSettings, setPendingSettings] = useState<Omit<PlanSettings, 'id' | 'createdAt'>>({
      selectedBooks: ['ket_level_1'],
      planMode: 'count',
      dailyLimit: 10,
      daysTarget: 30,
      learnOrder: 'alphabetical'
  });

  // Helper to get total words in selected books
  const getSelectedWordCount = (bookIds: string[]) => {
      return allBooks.filter(b => bookIds.includes(b.id)).reduce((acc, b) => acc + b.words.length, 0);
  };

  // Helper to recalculate on mode switch
  const handleModeChange = (newMode: 'count' | 'days') => {
      const total = getSelectedWordCount(pendingSettings.selectedBooks);
      if (newMode === 'count') {
          const days = pendingSettings.daysTarget || 30;
          const daily = Math.ceil(total / days);
          setPendingSettings(prev => ({...prev, planMode: newMode, dailyLimit: daily}));
      } else {
          const daily = pendingSettings.dailyLimit || 10;
          const days = Math.ceil(total / daily);
          setPendingSettings(prev => ({...prev, planMode: newMode, daysTarget: days}));
      }
  };

  const [resettingBooks, setResettingBooks] = useState(false); // Mode to allow book change

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    
    // Update counts using new 'scientific' definition
    const task = getReviewTask('today'); 
    setReviewCount(task.length);
    
    setMistakeCount(getMistakesList('all').length);
  }, [user, plan, now]); // Recalc stats on time change

  // Separate effect for syncing pendingSettings to avoid resetting user input on time tick
  useEffect(() => {
    if (plan) {
        setPendingSettings({
            selectedBooks: plan.selectedBooks,
            planMode: plan.planMode,
            dailyLimit: plan.dailyLimit,
            daysTarget: plan.daysTarget,
            learnOrder: plan.learnOrder
        });
    }
  }, [plan]);

  if (!user) return null;

  const handleSettingsSave = () => {
      if (plan && !resettingBooks) {
          savePlan(pendingSettings);
          setIsSettingsOpen(false);
          toast.success("Plan updated!");
      } else {
          const oldSet = new Set(plan?.selectedBooks || []);
          const newSet = new Set(pendingSettings.selectedBooks);
          let changed = false;
          for (const b of oldSet) {
              if (!newSet.has(b)) {
                  changed = true; 
                  break;
              }
          }
          
          if (changed || !plan) {
              if (!plan) {
                  savePlan(pendingSettings);
                  setIsSettingsOpen(false);
                  toast.success("Plan created!");
              } else {
                  setIsConfirmResetOpen(true);
              }
          } else {
              savePlan(pendingSettings);
              setIsSettingsOpen(false);
              toast.success("Plan updated (New books added)!");
          }
      }
  };

  const confirmReset = () => {
      savePlan(pendingSettings); 
      setIsConfirmResetOpen(false);
      setIsSettingsOpen(false);
      setResettingBooks(false);
      toast.success("Plan reset! Previous progress cleared.");
  };

  const handleStartLearning = () => {
      if (!plan) {
          setIsSettingsOpen(true);
          toast.info("Please set up a learning plan first.");
          return;
      }
      setLocation('/learn');
  };

  const handleTimeTravel = () => {
      if (!debugDate) return;
      setSystemTime(debugDate);
      setIsDebugOpen(false);
      toast.success(`Time travelled to ${debugDate}`);
  };

  const userAvatar = user.avatarId && AVATAR_MAP[user.avatarId] ? AVATAR_MAP[user.avatarId] : null;
  const isGoalReached = stats ? (stats.todayLearned >= stats.dailyGoal) : false;

  // Timeline Logic
  const timelineDays = stats?.daysTarget || 30;
  const currentDay = stats?.daysSinceStart || 1;
  const progressPercent = Math.min(100, (currentDay / timelineDays) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col w-full md:max-w-6xl mx-auto relative overflow-y-auto md:overflow-hidden md:justify-center">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 z-20 w-full md:absolute md:top-6 md:left-8 md:right-8 md:mb-0 px-2 md:px-0" style={{maxWidth: '1010px', margin: '0 auto', right: 0, left: 0}}>
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 border-white overflow-hidden bg-white"
            style={!userAvatar ? { backgroundColor: user.avatarColor } : {}}
          >
            {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                user.username[0].toUpperCase()
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground flex items-center">Hi, {user.username}!</h1>
                {isSimulated && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-md font-bold animate-pulse">TIME TRAVEL</span>}
            </div>
            <div className="flex gap-2">
                <p className="text-xs text-muted-foreground font-medium cursor-pointer hover:underline" onClick={logout}>
                Log out
                </p>
                {user.username === 'zhx' && (
                    <span className="text-xs text-primary font-bold cursor-pointer hover:underline" onClick={() => setIsDebugOpen(true)}>Debug Time</span>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
            {!user.isAdmin && (
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation('/leaderboard')}>
                    <Crown className="w-6 h-6 text-yellow-500 fill-current" />
                </Button>
            )}
            
            {user.isAdmin && (
                <Button variant="outline" size="sm" className="rounded-full bg-primary/10 text-primary border-primary/20 shadow-sm" onClick={() => setLocation('/vocab')}>
                    <BookPlus className="w-4 h-4 mr-1" /> Admin
                </Button>
            )}
            
            <Dialog open={isSettingsOpen} onOpenChange={(open) => { 
                if (open) {
                    if (plan) setPendingSettings({
                        selectedBooks: plan.selectedBooks,
                        planMode: plan.planMode,
                        dailyLimit: plan.dailyLimit,
                        daysTarget: plan.daysTarget,
                        learnOrder: plan.learnOrder
                    });
                    setResettingBooks(false);
                }
                setIsSettingsOpen(open); 
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full shadow-sm">
                  <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl max-h-[80vh] overflow-y-auto">
                {/* ... existing settings content ... */}
                {/* Simplified for brevity in edit, keeping existing structure */}
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Plan Settings</DialogTitle>
                  <DialogDescription>Customize your learning journey / 学习计划设置</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* ... same as before ... */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                            <Label className="text-base font-black">1. Choose Books</Label>
                            <span className="text-xs text-muted-foreground">选择词书</span>
                        </div>
                        {plan && !resettingBooks && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => setResettingBooks(true)}>
                                <RefreshCcw className="w-3 h-3 mr-1" /> Reset Books
                            </Button>
                        )}
                    </div>
                    
                    <div className={`grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 ${plan && !resettingBooks ? 'opacity-50 pointer-events-none' : ''}`}>
                        {allBooks.map(b => (
                            <div key={b.id} className="flex items-center space-x-2 bg-white p-2 rounded-xl border">
                                <Checkbox 
                                    id={`book-${b.id}`}
                                    checked={pendingSettings.selectedBooks.includes(b.id)}
                                    onCheckedChange={(checked) => {
                                        const newBooks = checked 
                                            ? [...pendingSettings.selectedBooks, b.id] 
                                            : pendingSettings.selectedBooks.filter(id => id !== b.id);
                                        const total = getSelectedWordCount(newBooks);
                                        let newDaily = pendingSettings.dailyLimit;
                                        let newDays = pendingSettings.daysTarget;
                                        if (pendingSettings.planMode === 'count') {
                                            newDays = Math.ceil(total / (newDaily || 1));
                                        } else {
                                            newDaily = Math.ceil(total / (newDays || 1));
                                        }
                                        setPendingSettings(prev => ({
                                            ...prev,
                                            selectedBooks: newBooks,
                                            dailyLimit: newDaily,
                                            daysTarget: newDays
                                        }));
                                    }}
                                />
                                <label htmlFor={`book-${b.id}`} className="text-sm font-bold flex-1 truncate cursor-pointer">
                                    {b.title}
                                </label>
                                <span className="text-[10px] text-muted-foreground">{b.words.length} words</span>
                            </div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <Label className="text-base font-black">2. Learning Target</Label>
                        <span className="text-xs text-muted-foreground">学习目标</span>
                      </div>
                      <Tabs value={pendingSettings.planMode} onValueChange={(v) => handleModeChange(v as any)}>
                          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gray-100 p-1">
                              <TabsTrigger value="count" className="rounded-lg text-xs font-bold">Daily Count<br/><span className="scale-90 font-normal">每日词数</span></TabsTrigger>
                              <TabsTrigger value="days" className="rounded-lg text-xs font-bold">Target Days<br/><span className="scale-90 font-normal">计划天数</span></TabsTrigger>
                          </TabsList>
                          <TabsContent value="count" className="pt-2">
                              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border">
                                  <span className="text-sm font-bold">Words Per Day</span>
                                  <Input 
                                      type="number" 
                                      value={pendingSettings.dailyLimit}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value) || 5;
                                          const total = getSelectedWordCount(pendingSettings.selectedBooks);
                                          const days = Math.ceil(total / val);
                                          setPendingSettings({...pendingSettings, dailyLimit: val, daysTarget: days});
                                      }}
                                      className="w-20 text-center font-black rounded-xl"
                                  />
                              </div>
                          </TabsContent>
                          <TabsContent value="days" className="pt-2">
                              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border">
                                  <span className="text-sm font-bold">Total Days</span>
                                  <Input 
                                      type="number" 
                                      value={pendingSettings.daysTarget || 30}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value) || 1;
                                          const total = getSelectedWordCount(pendingSettings.selectedBooks);
                                          const daily = Math.ceil(total / val);
                                          setPendingSettings({...pendingSettings, daysTarget: val, dailyLimit: daily});
                                      }}
                                      className="w-20 text-center font-black rounded-xl"
                                  />
                              </div>
                          </TabsContent>
                      </Tabs>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                        <Label className="text-base font-black">3. Order</Label>
                        <span className="text-xs text-muted-foreground">学习顺序</span>
                    </div>
                    <Select 
                        value={pendingSettings.learnOrder || 'alpha'} 
                        onValueChange={(v) => setPendingSettings({...pendingSettings, learnOrder: v as any})}
                    >
                        <SelectTrigger className="h-12 rounded-xl font-bold bg-gray-50 border-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alphabetical">Alphabetical / 字母顺序</SelectItem>
                            <SelectItem value="random">Random / 随机顺序</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                    <Button onClick={handleSettingsSave} className="w-full h-12 text-lg font-black rounded-2xl shadow-lg">Save Plan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <Dialog open={isConfirmResetOpen} onOpenChange={setIsConfirmResetOpen}>
          <DialogContent className="max-w-xs rounded-3xl">
              <div className="p-4 text-center space-y-4">
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black leading-none">Reset Warning</h3>
                    <p className="text-sm font-bold text-muted-foreground opacity-80">确认重置计划？</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                      You removed book(s) from your plan. This will <span className="font-bold text-destructive">DELETE all progress</span> for this plan and start fresh.
                      <br/><span className="text-xs opacity-70">您移除了部分词书。这将清空当前计划的所有进度并重新开始。</span>
                  </p>
                  <div className="flex flex-col gap-2">
                      <Button onClick={confirmReset} variant="destructive" className="h-12 rounded-2xl font-black text-lg flex flex-col items-center justify-center leading-none">
                        <span>Yes, Reset All</span>
                        <span className="text-[10px] font-normal opacity-70">确认重置</span>
                      </Button>
                      <Button variant="ghost" onClick={() => setIsConfirmResetOpen(false)} className="rounded-2xl flex flex-col items-center justify-center leading-none text-muted-foreground">
                        <span>Cancel</span>
                        <span className="text-[10px] font-normal opacity-70">取消</span>
                      </Button>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* Debug Time Dialog */}
      <Dialog open={isDebugOpen} onOpenChange={setIsDebugOpen}>
          <DialogContent className="max-w-xs rounded-3xl">
              <DialogHeader>
                  <DialogTitle>Time Travel (Admin)</DialogTitle>
                  <DialogDescription>Simulate future date for testing.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="bg-gray-100 p-2 rounded-xl text-center">
                      <div className="text-xs text-muted-foreground">Current Simulated Date</div>
                      <div className="font-mono font-bold text-lg">{new Date(now).toDateString()}</div>
                  </div>
                  <Input type="date" onChange={(e) => setDebugDate(e.target.value)} />
                  <Button onClick={handleTimeTravel} className="w-full">Jump to Date</Button>
                  <Button variant="outline" onClick={() => { resetSystemTime(); setIsDebugOpen(false); }} className="w-full">Reset to Real Time</Button>
              </div>
          </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-center md:gap-16 w-full flex-1 md:px-12">
      {/* Stats Hero */}
      <div className="flex-1 flex flex-col items-center justify-center z-0 w-full max-w-md mx-auto">
        <div className="relative w-48 h-48 md:w-64 md:h-64 mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <img src={mascot} alt="Mascot" className="relative w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
          
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/10" />
             <circle 
                cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" 
                className="text-primary transition-all duration-1000"
                strokeDasharray="301.6"
                strokeDashoffset={301.6 * (1 - (stats ? (stats.learnedUnique / Math.max(1, stats.totalWords)) : 0))}
                strokeLinecap="round"
             />
          </svg>
        </div>
        
        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <Card className="p-4 bg-white/50 backdrop-blur border-none shadow-sm flex flex-col items-center rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary/30">
                <div className="h-full bg-secondary" style={{width: `${stats ? (stats.learnedUnique / (stats.totalWords || 1)) * 100 : 0}%`}}></div>
            </div>
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-black text-secondary leading-none">{stats?.learnedUnique || 0} <span className="text-xs text-muted-foreground font-medium">/ {stats?.totalWords || 0}</span></div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex flex-col items-center leading-none gap-0.5 mt-1">
                    <span>Cumulative</span><span>累计学习</span>
                </div>
            </div>
          </Card>
          <Card className="p-4 bg-white/50 backdrop-blur border-none shadow-sm flex flex-col items-center rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-accent/30">
                <div className="h-full bg-accent" style={{width: `${stats ? (stats.todayLearned / (stats.dailyGoal || 1)) * 100 : 0}%`}}></div>
             </div>
             <div className="flex flex-col items-center justify-center h-full">
                <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-3xl font-black text-accent">{stats?.todayLearned || 0}</span>
                    <span className="text-sm font-bold text-muted-foreground">/ {stats?.dailyGoal || 0}</span>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex flex-col items-center leading-none gap-0.5 mt-1">
                    <span>Today's Goal</span><span>今日目标</span>
                </div>
             </div>
          </Card>
          
          {/* New Timeline Card */}
          <Card className="col-span-2 p-4 bg-white/50 backdrop-blur border-none shadow-sm flex flex-col justify-center rounded-3xl relative overflow-hidden px-6 gap-2">
             <div className="flex items-center justify-between w-full">
                 <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><CalendarClock className="w-3 h-3"/> Day {currentDay}</span>
                    <span className="text-2xl font-black text-green-600">{new Date(now).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                 </div>
                 <div className="text-right flex flex-col items-end leading-none gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Goal</span>
                    <span className="text-xl font-bold text-muted-foreground">{timelineDays} Days</span>
                 </div>
             </div>
             
             {/* Timeline Visual */}
             <div className="w-full h-3 bg-gray-100 rounded-full relative mt-1">
                 <div className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all duration-500" style={{width: `${progressPercent}%`}}></div>
                 {/* Current Day Marker */}
                 <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-green-600 rounded-full shadow-sm" style={{left: `calc(${progressPercent}% - 8px)`}}></div>
             </div>
             <div className="flex justify-between w-full text-[9px] text-muted-foreground font-medium">
                 <span>Start</span>
                 <span>Target</span>
             </div>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4 z-10 mb-8 w-full max-w-md mx-auto md:max-w-sm md:mb-0">
        {!isGoalReached ? (
            <Button 
                className="w-full h-20 text-2xl font-black rounded-3xl shadow-xl shadow-primary/30 flex items-center justify-between px-8 hover:scale-105 transition-transform"
                onClick={handleStartLearning}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span>Start Learning</span>
                        <span className="text-sm font-medium opacity-80">开始学习</span>
                    </div>
                </div>
                {reviewCount > 0 && (
                    <span className="bg-destructive text-white text-[10px] px-2 py-1 rounded-full animate-bounce">
                        {reviewCount} reviews
                    </span>
                )}
            </Button>
        ) : (
            <Button 
                className="w-full h-20 text-2xl font-black rounded-3xl shadow-xl bg-secondary hover:bg-secondary/90 text-white flex items-center justify-between px-8 hover:scale-105 transition-transform"
                onClick={() => setLocation('/learn')}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <PlusCircle className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span>Append Learning</span>
                        <span className="text-sm font-medium opacity-80">追加学习</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-[10px] bg-white/20 px-2 py-1 rounded-full mb-0.5">Finished!</div>
                    <div className="text-[9px] opacity-80">目标达成</div>
                </div>
            </Button>
        )}

        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" className="h-16 rounded-2xl border-2 hover:bg-secondary/10 font-bold flex flex-col gap-0 shadow-sm px-0" onClick={() => setLocation('/test')}>
            <Trophy className="w-5 h-5 text-secondary mb-1" />
            <span className="text-[10px] leading-none">Quiz</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">测试</span>
          </Button>
          <Button variant="outline" className="h-16 rounded-2xl border-2 hover:bg-green-100/50 font-bold flex flex-col gap-0 shadow-sm px-0 relative" onClick={() => setLocation('/review')}>
            <History className="w-5 h-5 text-green-600 mb-1" />
            <span className="text-[10px] leading-none">Review</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">复习</span>
            {reviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                {reviewCount}
              </span>
            )}
          </Button>
          <Button variant="outline" className="h-16 rounded-2xl border-2 hover:bg-accent/10 font-bold flex flex-col gap-0 shadow-sm px-0" onClick={() => setLocation('/stats')}>
            <BarChart3 className="w-5 h-5 text-accent mb-1" />
            <span className="text-[10px] leading-none">Stats</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">统计</span>
          </Button>
          <Button variant="outline" className="h-16 rounded-2xl border-2 hover:bg-destructive/10 font-bold flex flex-col gap-0 shadow-sm relative px-0" onClick={() => setLocation('/mistakes')}>
            <XCircle className="w-5 h-5 text-destructive mb-1" />
            <span className="text-[10px] leading-none">Errors</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">错题</span>
            {mistakeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {mistakeCount}
              </span>
            )}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
