'use client';

import { useState, useEffect, createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  verificationStatus: string;
  signatureID?: string;
  kycURL?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthSeparated() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthSeparated must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/company/session');
      const data = await response.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/company/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/company/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/company/login';
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
