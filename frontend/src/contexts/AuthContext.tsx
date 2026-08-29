'use client';

/**
 * Authentication Context for Homelab & Network Ops Center
 * Provides Firebase Auth state and methods (Email/Password)
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth 
} from '@/lib/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithEmail: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    if (!auth) {
      clearTimeout(safetyTimer);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          clearTimeout(safetyTimer);
          setUser(user);
          setLoading(false);
        },
        (error) => {
          clearTimeout(safetyTimer);
          console.error('Auth state change error:', error);
          setLoading(false);
        }
      );

      return () => {
        clearTimeout(safetyTimer);
        unsubscribe();
      };
    } catch (error) {
      clearTimeout(safetyTimer);
      console.error('Firebase auth init error:', error);
      setLoading(false);
    }
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase not configured');
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
