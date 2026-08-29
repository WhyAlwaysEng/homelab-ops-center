'use client';

/**
 * Client Layout Wrapper for Homelab & Network Ops Center
 * Handles conditional navigation and padding based on auth state
 */

import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from './Navigation';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    

  }, []);

  const isLoggedIn = !!user;

  return (
    <>
      {/* Rainbow gradient top bar */}
      <div className="gradient-bar h-1 w-full fixed top-0 left-0 z-50" />

      {/* Navigation - only visible when logged in or demo mode */}
      {mounted && isLoggedIn && <Navigation />}

      {/* Main content */}
      <main
        className={`min-h-screen bg-slate-950 pt-1 transition-all duration-300 ${
          mounted && isLoggedIn ? 'md:pl-16 pb-20 md:pb-0' : ''
        }`}
      >
        {children}
      </main>
    </>
  );
}
