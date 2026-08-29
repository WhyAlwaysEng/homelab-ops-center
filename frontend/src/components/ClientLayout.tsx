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
  const [demoMode, setDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check demo mode from localStorage
    const checkDemoMode = () => {
      const isDemo = localStorage.getItem('homelab_demo_mode') === 'true';
      setDemoMode(isDemo);
    };
    
    checkDemoMode();

    // Listen for storage changes (when demo mode is toggled on other pages)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'homelab_demo_mode') {
        setDemoMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isLoggedIn = user || demoMode;

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
