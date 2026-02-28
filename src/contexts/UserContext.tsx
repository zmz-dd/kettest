
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiLogin, apiRegister } from '@/services/api';
import { nanoid } from 'nanoid';

// Types
export interface User {
  id: string;
  username: string;
  password?: string; // Optional in frontend state, but used for login
  avatarColor: string;
  avatarId?: string; 
  joinedAt?: number;
  isAdmin?: boolean; 
}

export interface AuthState {
  user: User | null;
  users: User[]; // Legacy local users list (for multi-user offline switching if needed)
  login: (username: string, pass: string) => Promise<boolean>;
  register: (username: string, pass: string, color?: string, avatarId?: string) => Promise<boolean>;
  adminCreateUser: (username: string, pass: string, color?: string, avatarId?: string) => boolean;
  deleteUser: (userId: string) => void;
  clearUserData: (userId: string) => void; 
  resetUserPassword: (userId: string, newPass: string) => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const UserContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY_SESSION = 'kids_vocab_session_v2';
const COLORS = ['#FFB703', '#219EBC', '#FB8500', '#8ECAE6', '#FF8FA3', '#A0C4FF'];

// Default Admin (Local Fallback)
const ADMIN_USER: User = {
  id: 'admin_zhx',
  username: 'zhx',
  avatarColor: '#023047',
  isAdmin: true
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState<User[]>([]); // Keep empty or load from local if we want offline fallback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }, [user]);

  const login = async (username: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
        // Admin Local Bypass
        if (username === 'zhx' && pass === '1989') {
            setUser(ADMIN_USER);
            return true;
        }

        const res = await apiLogin({ username, password: pass });
        if (res.success && res.user) {
            setUser(res.user);
            return true;
        }
        return false;
    } catch (e: any) {
        setError(e.message);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const register = async (username: string, pass: string, color?: string, avatarId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const id = nanoid();
        const finalColor = color || COLORS[Math.floor(Math.random() * COLORS.length)];
        
        await apiRegister({
            id,
            username,
            password: pass,
            avatarColor: finalColor,
            avatarId
        });
        
        // Auto login after register
        setUser({ id, username, avatarColor: finalColor, avatarId });
        return true;
    } catch (e: any) {
        setError(e.message);
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  // Legacy/Local methods (kept for compatibility or admin tools)
  const adminCreateUser = (username: string, pass: string, color?: string, avatarId?: string) => {
    // This was for local users array. Deprecated in server mode.
    return false;
  };

  const clearUserData = (userId: string) => {
      localStorage.removeItem(`kids_vocab_progress_v5_${userId}`);
      localStorage.removeItem(`kids_vocab_plan_v5_${userId}`);
      localStorage.removeItem(`kids_vocab_test_history_v5_${userId}`);
  };

  const resetUserPassword = (userId: string, newPass: string) => {
      // Not implemented on server yet
  };

  const deleteUser = (userId: string) => {
    // Not implemented on server yet
    clearUserData(userId);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, users, login, register, adminCreateUser, deleteUser, clearUserData, resetUserPassword, logout, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}
