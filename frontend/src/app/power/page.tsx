'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPowerStatus, shutdownSystem, rebootSystem, cancelPowerAction } from '@/lib/system-api';
import { Power, RotateCw, XCircle, Loader2, Clock, Server } from 'lucide-react';

export default function PowerPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {

    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getPowerStatus();
      setStatus(data);
    } catch {
      setStatus({ uptime: '14 days, 3 hours', uptime_seconds: 1216800, is_production: false });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const handleAction = async (action: 'shutdown' | 'reboot' | 'cancel') => {
    if (action !== 'cancel' && !confirm(`Are you sure you want to ${action}?`)) return;
    setActionLoading(action);
    try {
      let result: any;
      if (action === 'shutdown') result = await shutdownSystem();
      else if (action === 'reboot') result = await rebootSystem();
      else result = await cancelPowerAction();
      setToast({ msg: result?.message || 'Action queued', ok: true });
    } catch {
      setToast({ msg: 'Action failed (production only)', ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Power size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Power Management</h1>
          <p className="text-slate-400 mb-6">Sign in to manage system power</p>
          <p className="text-slate-400">Please <a href="/" className="text-cyan-400 hover:underline">sign in from the dashboard</a></p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3 mb-8">
          <Power size={28} /> Power Management
        </h1>

        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Server size={32} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Orange Pi</h2>
              <p className="text-slate-400 flex items-center gap-2">
                <Clock size={14} /> Uptime: {status ? formatUptime(status.uptime_seconds) : '...'}
              </p>
              <p className={`text-xs mt-1 ${status?.is_production ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.is_production ? '● Production Mode' : '● Development Mode'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => handleAction('shutdown')} disabled={!!actionLoading}
              className="glass-card glass-card-rose p-6 flex flex-col items-center gap-3 hover:border-rose-500/30 transition-all disabled:opacity-50">
              {actionLoading === 'shutdown' ? (
                <Loader2 size={32} className="text-rose-400 animate-spin" />
              ) : (
                <Power size={32} className="text-rose-400" />
              )}
              <span className="text-white font-medium">Shutdown</span>
              <span className="text-xs text-slate-500">Power off the system</span>
            </button>

            <button onClick={() => handleAction('reboot')} disabled={!!actionLoading}
              className="glass-card glass-card-amber p-6 flex flex-col items-center gap-3 hover:border-amber-500/30 transition-all disabled:opacity-50">
              {actionLoading === 'reboot' ? (
                <Loader2 size={32} className="text-amber-400 animate-spin" />
              ) : (
                <RotateCw size={32} className="text-amber-400" />
              )}
              <span className="text-white font-medium">Reboot</span>
              <span className="text-xs text-slate-500">Restart the system</span>
            </button>

            <button onClick={() => handleAction('cancel')} disabled={!!actionLoading}
              className="glass-card glass-card-emerald p-6 flex flex-col items-center gap-3 hover:border-emerald-500/30 transition-all disabled:opacity-50">
              {actionLoading === 'cancel' ? (
                <Loader2 size={32} className="text-emerald-400 animate-spin" />
              ) : (
                <XCircle size={32} className="text-emerald-400" />
              )}
              <span className="text-white font-medium">Cancel</span>
              <span className="text-xs text-slate-500">Cancel pending action</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 animate-fade-in-up ${toast.ok ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-rose-500/20 border-rose-500/50'}`}>
            <span className="text-sm text-white">{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
