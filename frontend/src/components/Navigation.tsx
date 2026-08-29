'use client';

/**
 * Navigation Component for Homelab & Network Ops Center
 * Fixed sidebar for desktop, bottom bar for mobile
 * Only visible after login or demo mode
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Settings,
  Database,
  Terminal,
  Power,
  Wifi,
  FileText,
  Clock,
  Activity,
  Server,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-400', activeColor: 'bg-cyan-500/20 border-cyan-500/50' },
  { href: '/bandwidth', label: 'Bandwidth', icon: Wifi, color: 'text-blue-400', activeColor: 'bg-blue-500/20 border-blue-500/50' },
  { href: '/terminal', label: 'Terminal', icon: Terminal, color: 'text-emerald-400', activeColor: 'bg-emerald-500/20 border-emerald-500/50' },
  { href: '/logs', label: 'Logs', icon: FileText, color: 'text-amber-400', activeColor: 'bg-amber-500/20 border-amber-500/50' },
  { href: '/backup', label: 'Backup', icon: Database, color: 'text-violet-400', activeColor: 'bg-violet-500/20 border-violet-500/50' },
  { href: '/scheduler', label: 'Cron', icon: Clock, color: 'text-rose-400', activeColor: 'bg-rose-500/20 border-rose-500/50' },
  { href: '/power', label: 'Power', icon: Power, color: 'text-rose-400', activeColor: 'bg-rose-500/20 border-rose-500/50' },
  { href: '/settings', label: 'Settings', icon: Settings, color: 'text-slate-400', activeColor: 'bg-slate-500/20 border-slate-500/50' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {

  }, []);

  // Don't show nav if not logged in and not in demo mode
  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar (left) */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-16 bg-slate-900/80 backdrop-blur-xl border-r border-white/[0.06] z-40 flex-col items-center py-6">
        {/* Logo */}
        <div className="mb-8">
          <Server size={24} className="text-cyan-400" />
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col items-center space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                  isActive
                    ? `${item.activeColor} border`
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <item.icon size={20} className={isActive ? item.color : ''} />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="mt-auto">
          <Activity size={16} className="text-emerald-400 animate-pulse" />
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl border-t border-white/[0.06] z-40 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-200 ${
                isActive
                  ? `${item.activeColor} border`
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <item.icon size={20} className={isActive ? item.color : ''} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
