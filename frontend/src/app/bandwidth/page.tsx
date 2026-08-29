'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBandwidthStats } from '@/lib/system-api';
import { Wifi, ArrowUp, ArrowDown, RefreshCw, Loader2 } from 'lucide-react';

export default function BandwidthPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const MOCK_INTERFACES = [
    { name: 'eth0', bytes_sent: 1073741824, bytes_recv: 5368709120, send_rate: 1048576, recv_rate: 5242880, send_rate_human: '1.0 MB/s', recv_rate_human: '5.0 MB/s', addresses: [{ type: 'IPv4', address: '192.168.1.50' }] },
    { name: 'wlan0', bytes_sent: 268435456, bytes_recv: 134217728, send_rate: 262144, recv_rate: 524288, send_rate_human: '256.0 KB/s', recv_rate_human: '512.0 KB/s', addresses: [{ type: 'IPv4', address: '192.168.1.51' }] },
  ];

  useEffect(() => {

    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getBandwidthStats();
      setStats(data);
    } catch {
      if (!stats) setStats({ interfaces: MOCK_INTERFACES });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Wifi size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Bandwidth Monitor</h1>
          <p className="text-slate-400 mb-6">Sign in to view bandwidth</p>
          <p className="text-slate-400">Please <a href="/" className="text-cyan-400 hover:underline">sign in from the dashboard</a></p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Wifi size={28} /> Bandwidth Monitor
          </h1>
          <button onClick={loadStats} className="px-4 py-2 bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 flex items-center gap-2">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(stats?.interfaces || []).map((iface: any) => (
            <div key={iface.name} className="glass-card glass-card-cyan p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg">{iface.name}</h3>
                <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                  {iface.addresses?.find((a: any) => a.type === 'IPv4')?.address || 'No IP'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <ArrowUp size={16} />
                    <span className="text-xs font-medium">UPLOAD</span>
                  </div>
                  <p className="text-xl font-bold text-white">{iface.send_rate_human || '0 B/s'}</p>
                  <p className="text-xs text-slate-500 mt-1">Total: {formatBytes(iface.bytes_sent)}</p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <ArrowDown size={16} />
                    <span className="text-xs font-medium">DOWNLOAD</span>
                  </div>
                  <p className="text-xl font-bold text-white">{iface.recv_rate_human || '0 B/s'}</p>
                  <p className="text-xs text-slate-500 mt-1">Total: {formatBytes(iface.bytes_recv)}</p>
                </div>
              </div>
            </div>
          ))}
          {(!stats?.interfaces || stats.interfaces.length === 0) && !loading && (
            <div className="col-span-2 glass-card p-8 text-center text-slate-500">No network interfaces found</div>
          )}
        </div>
      </div>
    </div>
  );
}
