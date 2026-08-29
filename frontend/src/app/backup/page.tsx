'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
} from '@/lib/system-api';
import {
  Database,
  Download,
  Upload,
  Trash2,
  Plus,
  Loader2,
  HardDrive,
  Check,
  X,
} from 'lucide-react';

export default function BackupPage() {
  const { user, loginWithGoogle } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {

    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await getBackups();
      setBackups(data);
    } catch {
      setBackups([
        { filename: 'backup_20240115_120000.db', size_bytes: 524288, created_at: '2024-01-15T12:00:00' },
        { filename: 'backup_20240114_120000.db', size_bytes: 512000, created_at: '2024-01-14T12:00:00' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBackup();
      setToast({ msg: 'Backup created!', ok: true });
      await loadBackups();
    } catch {
      setToast({ msg: 'Failed to create backup', ok: false });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (file: string) => {
    if (!confirm(`Restore from ${file}? Current data will be backed up first.`)) return;
    try {
      await restoreBackup(file);
      setToast({ msg: 'Restored successfully!', ok: true });
    } catch {
      setToast({ msg: 'Restore failed', ok: false });
    }
  };

  const handleDelete = async (file: string) => {
    if (!confirm(`Delete ${file}?`)) return;
    try {
      await deleteBackup(file);
      await loadBackups();
      setToast({ msg: 'Deleted', ok: true });
    } catch {
      setToast({ msg: 'Delete failed', ok: false });
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Database size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Backup & Restore</h1>
          <p className="text-slate-400 mb-6">Sign in to manage backups</p>
          <button onClick={loginWithGoogle} className="btn-glow w-full mb-3">Sign in with Google</button>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
              <Database size={28} /> Backup & Restore
            </h1>
            <p className="text-slate-400 mt-1">Manage database backups</p>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-glow flex items-center gap-2">
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Create Backup
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Filename</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Size</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Created</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">No backups yet</td></tr>
              ) : backups.map((b) => (
                <tr key={b.filename} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3 px-4 text-white font-mono text-sm">{b.filename}</td>
                  <td className="py-3 px-4 text-slate-400 text-sm">{formatBytes(b.size_bytes)}</td>
                  <td className="py-3 px-4 text-slate-400 text-sm">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleRestore(b.filename)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                        <Upload size={14} />
                      </button>
                      <button onClick={() => handleDelete(b.filename)}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {toast && (
          <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border flex items-center gap-2 animate-fade-in-up ${toast.ok ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-rose-500/20 border-rose-500/50'}`}>
            {toast.ok ? <Check size={18} className="text-emerald-400" /> : <X size={18} className="text-rose-400" />}
            <span className="text-sm text-white">{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
