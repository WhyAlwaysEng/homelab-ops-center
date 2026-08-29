/**
 * System API Client for Homelab & Network Ops Center
 * Covers: Backup, Terminal, Power, Bandwidth, Logs, Scheduler
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ===== Backup =====
export const getBackups = () => api<any[]>('/api/backup');
export const createBackup = (name?: string) =>
  api('/api/backup/create', { method: 'POST', body: JSON.stringify({ name }) });
export const restoreBackup = (file: string) =>
  api(`/api/backup/restore/${file}`, { method: 'POST' });
export const deleteBackup = (file: string) =>
  api(`/api/backup/${file}`, { method: 'DELETE' });

// ===== Terminal =====
export const execCommand = (command: string, timeout = 30) =>
  api<{ stdout: string; stderr: string; return_code: number }>('/api/terminal/exec', {
    method: 'POST',
    body: JSON.stringify({ command, timeout }),
  });
export const getSysInfo = () => api<Record<string, string>>('/api/terminal/sysinfo');

// ===== Power =====
export const getPowerStatus = () => api<any>('/api/power/status');
export const shutdownSystem = (delay = 0) =>
  api('/api/power/shutdown', { method: 'POST', body: JSON.stringify({ delay }) });
export const rebootSystem = (delay = 0) =>
  api('/api/power/reboot', { method: 'POST', body: JSON.stringify({ delay }) });
export const cancelPowerAction = () =>
  api('/api/power/cancel', { method: 'POST' });

// ===== Bandwidth =====
export const getBandwidthStats = () => api<any>('/api/bandwidth');
export const getInterfaces = () => api<any[]>('/api/bandwidth/interfaces');

// ===== Logs =====
export const getLogFiles = () => api<any[]>('/api/logs');
export const readLog = (name: string, lines = 100, search?: string) => {
  const params = new URLSearchParams({ lines: lines.toString() });
  if (search) params.append('search', search);
  return api<any>(`/api/logs/${name}?${params}`);
};
export const getDockerLogs = (container: string, lines = 100) =>
  api<any>(`/api/logs/docker/${container}?lines=${lines}`);

// ===== Scheduler =====
export const getScheduledTasks = () => api<any[]>('/api/scheduler');
export const createScheduledTask = (task: any) =>
  api('/api/scheduler', { method: 'POST', body: JSON.stringify(task) });
export const updateScheduledTask = (id: number, updates: any) =>
  api(`/api/scheduler/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteScheduledTask = (id: number) =>
  api(`/api/scheduler/${id}`, { method: 'DELETE' });
export const toggleScheduledTask = (id: number) =>
  api(`/api/scheduler/${id}/toggle`, { method: 'POST' });
