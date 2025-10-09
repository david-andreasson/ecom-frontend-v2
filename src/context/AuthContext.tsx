import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

type User = {
  token: string;
  email?: string;
  role?: string;
  [key: string]: any;
} | null;

type AuthContextValue = {
  user: User;
  setUser: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeToken(token: string): { sub?: string; email?: string; role?: string } | null {
  try { const decoded: any = jwtDecode(token); return { sub: decoded?.sub, email: decoded?.email, role: decoded?.role }; } catch { return null; }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = decodeToken(token);
    return { token, email: decoded?.email || decoded?.sub, role: decoded?.role };
  });

  useEffect(() => {
    const onAuthChanged = () => {
      const token = localStorage.getItem('token');
      if (!token) { setUser(null); return; }
      const decoded = decodeToken(token);
      setUser({ token, email: decoded?.email || decoded?.sub, role: decoded?.role });
    };
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    window.addEventListener('storage', onAuthChanged);
    return () => {
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('storage', onAuthChanged);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    try { localStorage.removeItem('user'); } catch {}
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
  };

  const value = useMemo<AuthContextValue>(() => ({ user, setUser, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
