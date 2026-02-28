
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

// Scientific Review Intervals (minutes) - Customized for User
// Schedule:
// Learn (Mar 1) -> Review 0 (Mar 1, Same Day)
// Review 0 -> Review 1 (Mar 2, +1d)
// Review 1 -> Review 2 (Mar 3, +1d)
// Review 2 -> Review 3 (Mar 5, +2d)
// Review 3 -> Review 4 (Mar 8, +3d)
// Review 4 -> Review 5 (Mar 15, +7d)
// Review 5 -> Review 6 (Mar 22, +7d)

const INTERVALS = [
    0,              // Stage 0: Same day (Immediate)
    24 * 60,        // Stage 1: +1 day
    24 * 60,        // Stage 2: +1 day
    2 * 24 * 60,    // Stage 3: +2 days
    3 * 24 * 60,    // Stage 4: +3 days
    7 * 24 * 60,    // Stage 5: +7 days
    7 * 24 * 60     // Stage 6: +7 days
];

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

  // Keys
  const progressKey = user ? `kids_vocab_progress_v5_${user.id}` : null;
  const planKey = user ? `kids_vocab_plan_v5_${user.id}` : null;
  const historyKey = user ? `kids_vocab_test_history_v5_${user.id}` : null;

  // --- Load Data ---
  useEffect(() => {
    if (!user) return;
    
    try {
      const savedPlan = localStorage.getItem(planKey!);
      if (savedPlan) {
          const p = JSON.parse(savedPlan);
          setPlan(p);
          
          // Load plan state
          const savedState = localStorage.getItem(`${planKey}_state`);
          if (savedState) {
              const s = JSON.parse(savedState);
              const todayStr = new Date(now).toDateString();
              if (s.todayDate !== todayStr) {
                  setPlanState({ todayDate: todayStr, todayLearnedCount: 0, todayMistakes: [] });
              } else {
                  setPlanState(s);
              }
          } else {
              setPlanState({ todayDate: new Date(now).toDateString(), todayLearnedCount: 0, todayMistakes: [] });
          }
      } else {
          setPlan(null); 
      }

      const savedProgress = localStorage.getItem(progressKey!);
      setProgress(savedProgress ? JSON.parse(savedProgress) : {});

      const savedHistory = localStorage.getItem(historyKey!);
      setTestHistory(savedHistory ? JSON.parse(savedHistory) : []);
    } catch (e) {
      console.error("Error loading vocabulary data", e);
    }
  }, [user, planKey, progressKey, historyKey]);

  // --- Save Data Helpers ---
  // Manual save to avoid auto-save race conditions
  const savePlanToStorage = (p: PlanSettings) => {
      if (user && planKey) localStorage.setItem(planKey, JSON.stringify(p));
  };
  const savePlanStateToStorage = (ps: PlanState) => {
      if (user && planKey) localStorage.setItem(`${planKey}_state`, JSON.stringify(ps));
  };
  const saveProgressToStorage = (p: ProgressMap) => {
      if (user && progressKey) localStorage.setItem(progressKey, JSON.stringify(p));
  };
  const saveHistoryToStorage = (h: TestRecord[]) => {
      if (user && historyKey) localStorage.setItem(historyKey, JSON.stringify(h));
  };

  const currentDayStr = new Date(now).toDateString();
  useEffect(() => {
      if (!user || !plan) return;
      if (planState.todayDate !== currentDayStr) {
          const newState = { todayDate: currentDayStr, todayLearnedCount: 0, todayMistakes: [] };
          setPlanState(newState);
          savePlanStateToStorage(newState);
      }
  }, [currentDayStr, user, plan]);

  // --- Auto-save for Global Settings only ---
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
          const newPlan = {
              ...settings,
              id: newId,
              createdAt: now // Use simulated time for creation
          };
          setPlan(newPlan);
          savePlanToStorage(newPlan);
          
          setProgress({});
          saveProgressToStorage({});

          const newState = { todayDate: new Date(now).toDateString(), todayLearnedCount: 0, todayMistakes: [] };
          setPlanState(newState);
          savePlanStateToStorage(newState);
          
          setTestHistory([]); 
          saveHistoryToStorage([]);
      } else {
          if (plan) {
              const updated = {
                  ...plan,
                  ...settings
              };
              setPlan(updated);
              savePlanToStorage(updated);
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
      setPlanState(ps => {
          const newState = {
              ...ps,
              todayMistakes: ps.todayMistakes.includes(word) ? ps.todayMistakes : [...ps.todayMistakes, word]
          };
          savePlanStateToStorage(newState);
          return newState;
      });
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
              // Reset to stage 0 for "Same Day" review
              newState.stage = 0;
              newState.nextReview = now; // Immediate review today

              setPlanState(ps => {
                  const newPs = { ...ps, todayLearnedCount: ps.todayLearnedCount + 1 };
                  savePlanStateToStorage(newPs);
                  return newPs;
              });
          }
          
          newState.lastReview = now;
          
          if (result === 'dont-know') {
              // Error
              newState.errorCount += 1;
              newState.stage = 0; // Reset stage
              newState.nextReview = now; // Immediate retry
              
              // Add to Today Mistakes
              recordMistake(word);
          } else {
              // Know
              // For a word currently in 'learning' status (just learned today),
              // we want it to stay at Stage 0 so it appears in "Review Today" list.
              // If it's a re-learn of an old word, maybe different? 
              // Assuming this function is primarily for the "Learn New Words" flow:
              if (newState.status === 'learning') {
                  newState.stage = 0;
                  newState.nextReview = now;
              }
          }
          
          const newProgress = { ...prev, [word]: newState };
          saveProgressToStorage(newProgress);
          return newProgress;
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
      if (mode === 'today') {
          // Scientific Review: All Due/Overdue words
          // "Scientific Review Task... count decreases by 1" logic implies words disappear when completed
          return planWords.filter(w => {
              const p = progress[w.word];
              if (!p || p.status === 'new' || p.status === 'mastered') return false;
              return p.nextReview <= now;
          });
      } else {
          // Fallback (All Learned Today)
          const todayStart = new Date(now).setHours(0,0,0,0);
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
              newState.stage = 0; // Reset progress
              
              // User Request: "Decrease today's review task count by 1" even if wrong.
              // So we consider this "attempted" for today and push the re-review to tomorrow.
              // Otherwise, it stays in the list and the count doesn't decrease.
              newState.nextReview = now + 24 * 60 * 60 * 1000; 
              
              recordMistake(word);
          } else {
              // Success: Advance stage
              const nextStage = newState.stage + 1;
              
              if (nextStage >= INTERVALS.length) {
                  newState.status = 'mastered';
                  newState.stage = nextStage; 
                  newState.nextReview = 8640000000000; // Far future
              } else {
                  newState.stage = nextStage;
                  newState.nextReview = now + INTERVALS[nextStage] * 60 * 1000;
              }
          }
          
          const newProgress = { ...prev, [word]: newState };
          saveProgressToStorage(newProgress);
          return newProgress;
      });
  }, [now, user, progressKey]);

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
              newState.stage = 0; // Reset to 0 on test fail
              newState.nextReview = now; // Immediate re-test? Or tomorrow? Test usually implies check.
              // Let's keep it 'now' for Test mode unless user complains. 
              // Actually Test mode isn't the Review Task.
              
              newState.lastReview = now;
              
              recordMistake(word);
              const newProgress = { ...prev, [word]: newState };
              saveProgressToStorage(newProgress);
              return newProgress;
          });
      }
  }, [now, user, progressKey]);

  const getMistakesList = useCallback((filter: 'all' | 'today' | 'high-freq') => {
      const list = planWords.filter(w => {
          const p = progress[w.word];
          if (!p || p.errorCount === 0) return false;
          if (filter === 'today') {
              return planState.todayMistakes.includes(w.word);
          }
          if (filter === 'high-freq') {
              return p.errorCount >= 2;
          }
          return true; // all
      });
      
      if (filter === 'high-freq' || filter === 'all') {
          return list.sort((a, b) => (progress[b.word]?.errorCount || 0) - (progress[a.word]?.errorCount || 0));
      }
      return list;
  }, [planWords, progress, planState.todayMistakes]);

  // Helper to get stage label for Review List
  const getStageLabel = (stage: number) => {
      const labels = [
          "Same Day / 当天", 
          "1 Day / 1天后", 
          "2 Days / 2天后", 
          "4 Days / 4天后", 
          "7 Days / 7天后", 
          "14 Days / 14天后", 
          "21 Days / 21天后"
      ];
      if (stage >= labels.length) return "Mastered / 已掌握";
      return labels[stage] || "Unknown";
  };

  return {
      plan,
      stats,
      planState, 
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
      progress 
  };
}
