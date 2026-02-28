
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/UserContext';
import { useTime } from '@/contexts/TimeContext';
import { nanoid } from 'nanoid';
import builtinBooks from '@/assets/builtin_books.json';

// --- Data Structures ---

export interface Word {
  word: string;
  pos: string;
  meaning: string;
  level: string; 
  bookId?: string; 
  initial?: string;
  phonetic?: string;
  audioUrl?: string;
  example?: string;
  exampleAudioUrl?: string;
}

export interface WordDetails {
  example?: string;
  exampleAudioUrl?: string;
  phonetic?: string;
  audioUrl?: string;
}

export interface UserProgress {
  status: 'new' | 'learning' | 'mastered';
  stage: number; // 0-8 Ebbinghaus stage
  nextReview: number; // Timestamp
  lastReview: number; // Timestamp
  firstLearnedAt: number; // Timestamp when first learned (status changed from new)
  errorCount: number; // Cumulative error count (Learn + Review + Test)
}

export interface ProgressMap { 
    [wordKey: string]: UserProgress; 
}

export interface PlanSettings {
  id: string; // Plan ID to track versions
  createdAt: number;
  selectedBooks: string[];
  planMode: 'count' | 'days';
  dailyLimit: number; // Words per day
  daysTarget?: number;
  learnOrder: 'alphabetical' | 'random';
}

export interface PlanState {
    todayDate: string;
    todayLearnedCount: number; // Count of words learned today (for daily goal)
    todayMistakes: string[]; // List of word keys
}

export interface TestRecord {
    id: string;
    timestamp: number;
    scope: string;
    count: number;
    score: number;
    mistakes: string[];
}

export interface VocabBook {
  id: string;
  title: string;
  description?: string;
  words: Word[];
  isBuiltIn?: boolean;
}

// Ebbinghaus Intervals (minutes)
// Updated to user request: 1, 2, 4, 7, 14, 21 days + initial short ones
// 0: 5m
// 1: 30m
// 2: 12h
// 3: 1d
// 4: 2d
// 5: 4d
// 6: 7d
// 7: 14d
// 8: 21d
const INTERVALS = [5, 30, 12 * 60, 24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60, 14 * 24 * 60, 21 * 24 * 60];

const STORAGE_KEY_CUSTOM_BOOKS = 'kids_vocab_custom_books_v3';
const STORAGE_KEY_WORD_OVERRIDES = 'kids_vocab_word_overrides_v1';

export function useVocabulary() {
  const { user } = useAuth();
  const { now } = useTime(); // Use global simulated time
  
  // --- Global State (Shared across users in browser, but independent logic) ---
  const [customBooks, setCustomBooks] = useState<VocabBook[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_BOOKS);
    return saved ? JSON.parse(saved) : [];
  });
  const [wordOverrides, setWordOverrides] = useState<Record<string, WordDetails>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WORD_OVERRIDES);
    return saved ? JSON.parse(saved) : {};
  });

  // --- User Specific State ---
  const [plan, setPlan] = useState<PlanSettings | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [planState, setPlanState] = useState<PlanState>({ todayDate: new Date(now).toDateString(), todayLearnedCount: 0, todayMistakes: [] });
  const [testHistory, setTestHistory] = useState<TestRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keys
  const progressKey = user ? `kids_vocab_progress_v5_${user.id}` : null;
  const planKey = user ? `kids_vocab_plan_v5_${user.id}` : null;
  const historyKey = user ? `kids_vocab_test_history_v5_${user.id}` : null;

  // --- Load Data ---
  useEffect(() => {
    if (!user) {
      setIsLoaded(false);
      return;
    }
    
    // Reset loaded state when user/keys change to prevent saving stale/empty data
    setIsLoaded(false);

    const savedPlan = localStorage.getItem(planKey!);
    if (savedPlan) {
        const p = JSON.parse(savedPlan);
        // Migration check if needed, else set
        setPlan(p);
        
        // Load plan state
        const savedState = localStorage.getItem(`${planKey}_state`);
        if (savedState) {
            const s = JSON.parse(savedState);
            // Check if todayDate matches 'now' (Simulated or Real)
            const todayStr = new Date(now).toDateString();
            if (s.todayDate !== todayStr) {
                // New Day -> Reset counters and todayMistakes
                setPlanState({ todayDate: todayStr, todayLearnedCount: 0, todayMistakes: [] });
            } else {
                setPlanState(s);
            }
        } else {
            setPlanState({ todayDate: new Date(now).toDateString(), todayLearnedCount: 0, todayMistakes: [] });
        }
    } else {
        setPlan(null); // No plan yet
    }

    const savedProgress = localStorage.getItem(progressKey!);
    setProgress(savedProgress ? JSON.parse(savedProgress) : {});

    const savedHistory = localStorage.getItem(historyKey!);
    setTestHistory(savedHistory ? JSON.parse(savedHistory) : []);

    setIsLoaded(true);
  }, [user, planKey, progressKey, historyKey]); // Removed 'now' dependency to prevent constant reloading // Re-run when 'now' changes significantly (day change)? 
  // Actually, now changes every second. This might cause too many re-reads.
  // We should only check day change.
  // Optimization: Use a ref or derived state for "currentDayString"
  
  const currentDayStr = new Date(now).toDateString();
  useEffect(() => {
      if (!user || !plan) return;
      if (planState.todayDate !== currentDayStr) {
          // Day changed detected by Time Travel or Natural Midnight
          setPlanState({ todayDate: currentDayStr, todayLearnedCount: 0, todayMistakes: [] });
      }
  }, [currentDayStr, user, plan]); // Only dependent on day string

  // --- Save Data ---
  // Only save if data has been loaded to prevent overwriting with initial empty state
  useEffect(() => { if (user && plan && isLoaded) localStorage.setItem(planKey!, JSON.stringify(plan)); }, [plan, planKey, user, isLoaded]);
  useEffect(() => { if (user && plan && isLoaded) localStorage.setItem(`${planKey}_state`, JSON.stringify(planState)); }, [planState, planKey, user, plan, isLoaded]);
  useEffect(() => { if (user && isLoaded) localStorage.setItem(progressKey!, JSON.stringify(progress)); }, [progress, progressKey, user, isLoaded]);
  useEffect(() => { if (user && isLoaded) localStorage.setItem(historyKey!, JSON.stringify(testHistory)); }, [testHistory, historyKey, user, isLoaded]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CUSTOM_BOOKS, JSON.stringify(customBooks)); }, [customBooks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_WORD_OVERRIDES, JSON.stringify(wordOverrides)); }, [wordOverrides]);

  // --- Derived Data ---
  const allBooks = useMemo(() => [...(builtinBooks as VocabBook[]), ...customBooks], [customBooks]);
  
  const allWords = useMemo(() => {
    return allBooks.flatMap(b => b.words.map(w => {
      const base = {...w, bookId: b.id};
      const override = wordOverrides[w.word.toLowerCase()];
      if (override) {
        return { ...base, ...override, meaning: base.meaning || override.phonetic } as Word; 
      }
      return base as Word;
    }));
  }, [allBooks, wordOverrides]);

  // Helper: Get active words for current plan
  const planWords = useMemo(() => {
      if (!plan) return [];
      return allWords.filter(w => plan.selectedBooks.includes(w.bookId || ''));
  }, [allWords, plan]);

  const stats = useMemo(() => {
      if (!plan) return null;
      
      const learnedUnique = planWords.filter(w => progress[w.word]?.status && progress[w.word].status !== 'new').length;
      const totalWords = planWords.length;
      const remaining = totalWords - learnedUnique;
      
      let dailyGoal = plan.dailyLimit;
      
      const isFinished = remaining === 0;

      // Calculate days progress correctly using Calendar Days
      const startDate = new Date(plan.createdAt).setHours(0,0,0,0);
      const currentDate = new Date(now).setHours(0,0,0,0);
      const daysSinceStart = Math.max(1, Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
      
      const daysTarget = plan.planMode === 'days' ? plan.daysTarget : Math.ceil(totalWords / (plan.dailyLimit || 1));

      return {
          totalWords,
          learnedUnique,
          remaining,
          dailyGoal,
          todayLearned: planState.todayLearnedCount,
          isFinished,
          daysSinceStart,
          daysTarget: daysTarget || 1,
          createdAt: plan.createdAt // Expose for Timeline
      };
  }, [plan, planWords, progress, planState.todayLearnedCount, now]);

  // --- Actions ---

  const savePlan = (settings: Omit<PlanSettings, 'id' | 'createdAt'>) => {
      if (!user) return;
      
      const newBookSet = new Set(settings.selectedBooks);
      const oldBookSet = new Set(plan?.selectedBooks || []);
      
      let isReset = false;
      if (plan) {
          for (const book of oldBookSet) {
              if (!newBookSet.has(book)) {
                  isReset = true;
                  break;
              }
          }
      } else {
          isReset = true; // First plan
      }

      if (isReset) {
          const newId = nanoid();
          setPlan({
              ...settings,
              id: newId,
              createdAt: now // Use simulated time for creation
          });
          setProgress({});
          setPlanState({ todayDate: new Date(now).toDateString(), todayLearnedCount: 0, todayMistakes: [] });
          setTestHistory([]); 
      } else {
          if (plan) {
              setPlan({
                  ...plan,
                  ...settings
              });
          }
      }
  };

  const getTodayTask = useCallback(() => {
      if (!plan) return [];
      
      let unlearned = planWords.filter(w => !progress[w.word] || progress[w.word].status === 'new');
      
      if (plan.learnOrder === 'random') {
          unlearned = unlearned.sort(() => Math.random() - 0.5);
      } else {
          unlearned = unlearned.sort((a, b) => a.word.localeCompare(b.word));
      }
      
      const remainingQuota = Math.max(0, plan.dailyLimit - planState.todayLearnedCount);
      
      return unlearned.slice(0, remainingQuota);
  }, [plan, planWords, progress, planState.todayLearnedCount]);

  const recordMistake = (word: string) => {
      setPlanState(ps => ({
          ...ps,
          todayMistakes: ps.todayMistakes.includes(word) ? ps.todayMistakes : [...ps.todayMistakes, word]
      }));
  };

  const recordLearnResult = (word: string, result: 'know' | 'dont-know') => {
      // Update Progress
      setProgress(prev => {
          const current = prev[word] || { 
              status: 'new', 
              stage: 0, 
              nextReview: 0, 
              lastReview: 0, 
              firstLearnedAt: 0, 
              errorCount: 0 
          };
          
          let newState = { ...current };
          
          // First time learning?
          if (newState.status === 'new') {
              newState.status = 'learning';
              newState.firstLearnedAt = now;
              // Increment Today Learned Count immediately
              setPlanState(ps => ({
                  ...ps,
                  todayLearnedCount: ps.todayLearnedCount + 1
              }));
          }
          
          newState.lastReview = now;
          
          if (result === 'dont-know') {
              // Error
              newState.errorCount += 1;
              newState.stage = 0; // Reset stage
              newState.nextReview = now + 5 * 60 * 1000; // 5 min review
              
              // Add to Today Mistakes
              recordMistake(word);
          } else {
              // Know
              // Advance stage
              newState.stage = Math.min(newState.stage + 1, INTERVALS.length - 1);
              newState.nextReview = now + INTERVALS[newState.stage] * 60 * 1000;
              if (newState.stage >= 5) newState.status = 'mastered'; // Simple mastery rule
          }
          
          return { ...prev, [word]: newState };
      });
  };

  const fetchRawNewWords = useCallback((count: number) => {
      if (!plan) return [];
      let unlearned = planWords.filter(w => !progress[w.word] || progress[w.word].status === 'new');
      if (plan.learnOrder === 'random') {
          // create copy to sort
          unlearned = [...unlearned].sort(() => Math.random() - 0.5);
      } else {
          unlearned = unlearned.sort((a, b) => a.word.localeCompare(b.word));
      }
      return unlearned.slice(0, count);
  }, [plan, planWords, progress]);

  const getReviewTask = useCallback((mode: 'today' | 'scientific') => {
      const todayStart = new Date(now).setHours(0,0,0,0);
      
      if (mode === 'today') {
          // Includes words learned today OR words scheduled for today
          // User: "including words learned today and words due today"
          // In previous version "today" was just learned today.
          // Now we combine both for "Scientific Review" card?
          // Wait, user said: "Scientific Review card... includes words learned today AND words due today"
          // So I should return ALL relevant words for 'scientific' mode logic if that's what 'Scientific Review' means.
          // Let's adhere to the new definition:
          // 'scientific' = All pending reviews + Today's learned words (reinforcement)
          
          // But `getReviewTask` signature is `mode: 'today' | 'scientific'`.
          // In Home.tsx, we use `getReviewTask('scientific').length` for notification.
          // Let's update the logic.
          
          const dueReviews = planWords.filter(w => {
              const p = progress[w.word];
              return p && p.status !== 'new' && p.nextReview <= now;
          });
          
          const learnedToday = planWords.filter(w => {
              const p = progress[w.word];
              return p && p.lastReview >= todayStart;
          });
          
          // Merge unique
          const set = new Set([...dueReviews, ...learnedToday]);
          return Array.from(set);
          
      } else {
          // Fallback or "Just Today's Learned" if needed separately?
          // Let's keep 'today' as strictly "Learned Today" for other uses if any
          return planWords.filter(w => {
              const p = progress[w.word];
              return p && p.lastReview >= todayStart;
          });
      }
  }, [planWords, progress, now]);

  const recordReviewResult = useCallback((word: string, result: 'know' | 'dont-know', mode: 'today' | 'scientific') => {
      
      setProgress(prev => {
          const current = prev[word];
          if (!current) return prev; // Should not happen
          
          let newState = { ...current };
          newState.lastReview = now;
          
          if (result === 'dont-know') {
              newState.errorCount += 1;
              newState.stage = 0; // Reset stage on fail
              newState.nextReview = now + 5 * 60 * 1000;
              recordMistake(word);
          } else {
              // Scientific mode: Success advances stage
              // If we are reviewing "Today's learned word" that isn't technically "due" yet (e.g. 5m interval not passed but we force reviewed), 
              // should we advance? 
              // User wants "Review Task" to include today's words.
              // Standard Ebbinghaus: Review when DUE.
              // If we review early, maybe just reset interval or advance? 
              // Safe bet: Always advance if "Know".
              newState.stage = Math.min(newState.stage + 1, INTERVALS.length - 1);
              newState.nextReview = now + INTERVALS[newState.stage] * 60 * 1000;
          }
          
          return { ...prev, [word]: newState };
      });
  }, [now]);

  const recordTestResult = useCallback((word: string, isCorrect: boolean) => {
      if (!isCorrect) {
          setProgress(prev => {
              const current = prev[word] || { 
                  status: 'new',
                  stage: 0, 
                  nextReview: 0, 
                  lastReview: 0, 
                  firstLearnedAt: 0, 
                  errorCount: 0 
              };
              
              let newState = { ...current };
              newState.errorCount += 1;
              newState.stage = Math.max(0, newState.stage - 1); 
              newState.lastReview = now;
              
              recordMistake(word);
              return { ...prev, [word]: newState };
          });
      }
  }, [now]);

  const getMistakesList = useCallback((filter: 'all' | 'today' | 'high-freq') => {
      const list = planWords.filter(w => {
          const p = progress[w.word];
          if (!p || p.errorCount === 0) return false;
          if (filter === 'today') {
              // Check if in todayMistakes list
              return planState.todayMistakes.includes(w.word);
          }
          if (filter === 'high-freq') {
              return p.errorCount >= 2;
          }
          return true; // all
      });
      
      // Sort
      if (filter === 'high-freq' || filter === 'all') {
          return list.sort((a, b) => (progress[b.word]?.errorCount || 0) - (progress[a.word]?.errorCount || 0));
      }
      return list;
  }, [planWords, progress, planState.todayMistakes]);

  // Helper to get stage label for Review List
  const getStageLabel = (stage: number) => {
      const labels = [
          "5 min / 5分钟", 
          "30 min / 30分钟", 
          "12 hours / 12小时", 
          "1 Day / 1天后", 
          "2 Days / 2天后", 
          "4 Days / 4天后", 
          "7 Days / 7天后", 
          "14 Days / 14天后", 
          "21 Days / 21天后"
      ];
      return labels[stage] || "Finished / 完成";
  };

  return {
      plan,
      stats,
      planState, // Exported for direct access if needed
      savePlan,
      getTodayTask,
      fetchRawNewWords,
      recordLearnResult,
      getReviewTask,
      recordReviewResult,
      recordTestResult,
      getMistakesList,
      getStageLabel,
      allBooks,
      customBooks,
      progress // exposed for Leaderboard
  };
}
