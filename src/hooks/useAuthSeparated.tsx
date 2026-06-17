'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

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
  login: (email: string, password: string, context: 'admin' | 'operator') => Promise<{ success: boolean; error?: string }>;
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
  const router = useRouter();

  // Verificar sesión actual
  const checkSession = async (context: 'admin' | 'operator') => {
    try {
      const response = await fetch(`/api/auth/${context}/session`);
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email: string, password: string, context: 'admin' | 'operator') => {
    try {
      const response = await fetch(`/api/auth/${context}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  // Logout
  const logout = async (context: 'admin' | 'operator') => {
    console.log('Logout called with context:', context);
    try {
      await fetch(`/api/auth/${context}/logout`, {
        method: 'POST',
        credentials: 'include', // Asegurar que las cookies se incluyan
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Forzar recarga de la página para asegurar que las cookies se eliminen
      if (typeof window !== 'undefined') {
        console.log('Redirecting to:', `/auth/${context}/login`);
        window.location.href = `/auth/${context}/login`;
      }
    }
  };

  // Auto-detect context based on current path
  const getContextFromPath = (): 'admin' | 'operator' | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const pathname = window.location.pathname;
      console.log('Detecting context for pathname:', pathname);
      if (pathname.startsWith('/auth/admin') || pathname.startsWith('/dashboard')) {
        console.log('Context detected: admin');
        return 'admin';
      } else if (pathname.startsWith('/auth/operator') || pathname.startsWith('/operator')) {
        console.log('Context detected: operator');
        return 'operator';
      }
    } catch (error) {
      console.error('Error detecting context:', error);
    }
    console.log('No context detected, returning null');
    return null;
  };

  // Check session on mount
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    const context = getContextFromPath();
    if (context) {
      checkSession(context);
    } else {
      setLoading(false);
    }
  }, []);

  // Wrapper function that uses detected context
  const logoutWithContext = async () => {
    const context = getContextFromPath();
    if (context) {
      await logout(context);
    } else {
      console.error('Cannot logout: no context detected');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout: logoutWithContext,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
