'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getScheduledTasks, createScheduledTask, deleteScheduledTask, toggleScheduledTask } from '@/lib/system-api';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X } from 'lucide-react';

export default function SchedulerPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', command: '', interval_seconds: 3600 });

  useEffect(() => {

    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await getScheduledTasks();
      setTasks(data);
    } catch {
      setTasks([
        { id: 1, name: 'Backup Database', command: 'backup', interval_seconds: 21600, enabled: true },
        { id: 2, name: 'Check DDNS', command: 'ddns_check', interval_seconds: 300, enabled: true },
        { id: 3, name: 'Cleanup Logs', command: 'log_cleanup', interval_seconds: 86400, enabled: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.command) return;
    try {
      await createScheduledTask(form);
      setShowAdd(false);
      setForm({ name: '', command: '', interval_seconds: 3600 });
      await loadTasks();
    } catch { /* demo mode */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try { await deleteScheduledTask(id); await loadTasks(); } catch { /* demo mode */ }
  };

  const handleToggle = async (id: number) => {
    try { await toggleScheduledTask(id); await loadTasks(); } catch { /* demo mode */ }
  };

  const formatInterval = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Clock size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Scheduler</h1>
          <p className="text-slate-400 mb-6">Sign in to manage tasks</p>
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
            <Clock size={28} /> Scheduler
          </h1>
          <button onClick={() => setShowAdd(true)} className="btn-glow flex items-center gap-2">
            <Plus size={18} /> Add Task
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => handleToggle(task.id)}>
                  {task.enabled ? (
                    <ToggleRight size={28} className="text-emerald-400" />
                  ) : (
                    <ToggleLeft size={28} className="text-slate-500" />
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-white">{task.name}</h3>
                  <p className="text-xs text-slate-500">{task.command} • Every {formatInterval(task.interval_seconds)}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Add Scheduled Task</h2>
                <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Task name" className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm mb-3 focus:outline-none focus:border-cyan-500" />
              <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })}
                placeholder="Command to run" className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm mb-3 focus:outline-none focus:border-cyan-500" />
              <label className="text-sm text-slate-400 mb-1 block">Interval (seconds)</label>
              <input type="number" value={form.interval_seconds} onChange={(e) => setForm({ ...form, interval_seconds: parseInt(e.target.value) || 3600 })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm mb-4 focus:outline-none focus:border-cyan-500" />
              <button onClick={handleAdd} className="btn-glow w-full">Create Task</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
