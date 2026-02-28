
import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimeContextType {
  now: number;
  setSystemTime: (date: string) => void;
  resetSystemTime: () => void;
  offset: number;
  isSimulated: boolean;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const TimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [offset, setOffset] = useState<number>(() => {
    const saved = localStorage.getItem('kids_vocab_time_offset_v1');
    return saved ? parseInt(saved) : 0;
  });

  const [currentTime, setCurrentTime] = useState<number>(Date.now() + offset);

  // Tick every second to update current time view if needed, 
  // but for most logic we just read 'now' which is dynamic if we use Date.now() + offset.
  // However, React state update triggers re-renders. 
  // We can just provide a getter or a stable value that updates?
  // Let's just expose `now` as a value that updates every minute or so? 
  // Actually, for most logic, we want the instantaneous time when the function runs.
  // Context value 'now' might be stale if we don't update it. 
  // Better approach: Expose `getNow()` function? 
  // Or just update `now` state every second.
  
  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(Date.now() + offset);
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, [offset]);

  const setSystemTime = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return;
    const currentReal = Date.now();
    const newOffset = target - currentReal;
    setOffset(newOffset);
    localStorage.setItem('kids_vocab_time_offset_v1', newOffset.toString());
    setCurrentTime(target);
  };

  const resetSystemTime = () => {
    setOffset(0);
    localStorage.removeItem('kids_vocab_time_offset_v1');
    setCurrentTime(Date.now());
  };

  const value = {
    now: currentTime,
    setSystemTime,
    resetSystemTime,
    offset,
    isSimulated: offset !== 0
  };

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
};

export const useTime = () => {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
};
