'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { execCommand, getSysInfo } from '@/lib/system-api';
import { Terminal as TerminalIcon, Play, Trash2, Loader2, Server } from 'lucide-react';

interface TerminalLine {
  command: string;
  output: string;
  isError: boolean;
  timestamp: Date;
}

export default function TerminalPage() {
  const { user } = useAuth();
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [sysInfo, setSysInfo] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    getSysInfo().then(setSysInfo).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleExecute = async () => {
    if (!command.trim() || running) return;
    const cmd = command.trim();
    setCommand('');
    setRunning(true);

    

    try {
      const result = await execCommand(cmd);
      setHistory((prev) => [...prev, {
        command: cmd,
        output: result.stdout || result.stderr || '(no output)',
        isError: result.return_code !== 0,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setHistory((prev) => [...prev, {
        command: cmd,
        output: `Error: ${err}`,
        isError: true,
        timestamp: new Date(),
      }]);
    } finally {
      setRunning(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <TerminalIcon size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Terminal</h1>
          <p className="text-slate-400 mb-6">Sign in to access terminal</p>
          <p className="text-slate-400">Please <a href="/" className="text-cyan-400 hover:underline">sign in from the dashboard</a></p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3 mb-6">
          <TerminalIcon size={28} /> Terminal
        </h1>

        {Object.keys(sysInfo).length > 0 && (
          <div className="glass-card p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(sysInfo).map(([k, v]) => (
              <div key={k}>
                <span className="text-xs text-slate-500 uppercase">{k}</span>
                <p className="text-sm text-white truncate" title={v}>{v || '—'}</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card p-4">
          <div className="bg-slate-950 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
            {history.length === 0 && (
              <p className="text-slate-500">Type a command and press Enter or click Run...</p>
            )}
            {history.map((line, i) => (
              <div key={i} className="mb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="text-slate-500">$</span>
                  <span>{line.command}</span>
                  <span className="text-slate-600 text-xs ml-auto">
                    {line.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className={`mt-1 whitespace-pre-wrap ${line.isError ? 'text-rose-400' : 'text-slate-300'}`}>
                  {line.output}
                </pre>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex gap-2 mt-4">
            <div className="flex-1 flex items-center bg-slate-800/50 rounded-lg border border-slate-700 px-3">
              <span className="text-cyan-400 mr-2">$</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                placeholder="Type command..."
                className="flex-1 bg-transparent py-3 text-white focus:outline-none font-mono"
                disabled={running}
              />
            </div>
            <button onClick={handleExecute} disabled={running || !command.trim()}
              className="btn-glow px-6 flex items-center gap-2 disabled:opacity-50">
              {running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Run
            </button>
            <button onClick={() => setHistory([])}
              className="px-4 py-2 bg-slate-800/50 text-slate-400 rounded-lg hover:text-rose-400 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
