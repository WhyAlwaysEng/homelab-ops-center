'use client';

/**
 * Authentication Context for Homelab & Network Ops Center
 * Provides Firebase Auth state and methods
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  googleProvider 
} from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

/**
 * Hook to access authentication context
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Authentication Provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — always resolve loading after 3 seconds max
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // If auth is not available (Firebase not configured), skip auth
    if (!auth) {
      clearTimeout(safetyTimer);
      setLoading(false);
      return;
    }

    try {
      // Listen for auth state changes
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

      // Cleanup subscription on unmount
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

  /**
   * Sign in with Google popup
   */
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
