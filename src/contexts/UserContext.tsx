
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { nanoid } from 'nanoid';

// Types
export interface User {
  id: string;
  username: string;
  password: string;
  avatarColor: string;
  avatarId?: string; 
  joinedAt: number;
  isAdmin?: boolean; 
}

export interface AuthState {
  user: User | null;
  users: User[];
  login: (username: string, pass: string) => boolean;
  register: (username: string, pass: string, color?: string, avatarId?: string) => boolean;
  adminCreateUser: (username: string, pass: string, color?: string, avatarId?: string) => boolean;
  deleteUser: (userId: string) => void;
  clearUserData: (userId: string) => void; // New: Clear data without deleting user
  resetUserPassword: (userId: string, newPass: string) => void;
  logout: () => void;
}

const UserContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY_USERS = 'kids_vocab_users_v2';
const STORAGE_KEY_SESSION = 'kids_vocab_session_v2';

const COLORS = ['#FFB703', '#219EBC', '#FB8500', '#8ECAE6', '#FF8FA3', '#A0C4FF'];

// Default Admin
const ADMIN_USER: User = {
  id: 'admin_zhx',
  username: 'zhx',
  password: '1989',
  avatarColor: '#023047',
  joinedAt: 0,
  isAdmin: true
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    let loaded = saved ? JSON.parse(saved) : [];
    if (!loaded.some((u: User) => u.username === 'zhx')) {
      loaded = [ADMIN_USER, ...loaded];
    }
    return loaded;
  });

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSION);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  }, [user]);

  const login = (username: string, pass: string) => {
    const found = users.find(u => u.username === username && u.password === pass);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const register = (username: string, pass: string, color?: string, avatarId?: string) => {
    if (users.length >= 101) return false; // Limit 100 users + 1 admin
    if (users.some(u => u.username === username)) return false;
    
    const newUser: User = {
      id: nanoid(),
      username,
      password: pass,
      avatarColor: color || COLORS[users.length % COLORS.length],
      avatarId: avatarId, 
      joinedAt: Date.now(),
      isAdmin: false
    };
    
    setUsers(prev => [...prev, newUser]);
    setUser(newUser); 
    return true;
  };

  const adminCreateUser = (username: string, pass: string, color?: string, avatarId?: string) => {
    if (users.length >= 101) return false;
    if (users.some(u => u.username === username)) return false;
    
    const newUser: User = {
      id: nanoid(),
      username,
      password: pass,
      avatarColor: color || COLORS[users.length % COLORS.length],
      avatarId: avatarId, 
      joinedAt: Date.now(),
      isAdmin: false
    };
    
    setUsers(prev => [...prev, newUser]);
    return true;
  };

  const clearUserData = (userId: string) => {
      // Clear specific user data keys
      localStorage.removeItem(`kids_vocab_progress_v5_${userId}`);
      localStorage.removeItem(`kids_vocab_plan_v5_${userId}`);
      localStorage.removeItem(`kids_vocab_test_history_v5_${userId}`);
      // Legacy cleanup
      localStorage.removeItem(`kids_vocab_progress_v4_${userId}`);
      localStorage.removeItem(`kids_vocab_settings_v4_${userId}`);
      localStorage.removeItem(`kids_vocab_today_v4_${userId}`);
  };

  const resetUserPassword = (userId: string, newPass: string) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    clearUserData(userId);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, users, login, register, adminCreateUser, deleteUser, clearUserData, resetUserPassword, logout }}>
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
