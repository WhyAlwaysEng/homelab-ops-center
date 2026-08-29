'use client';

/**
 * Main Dashboard Page for Homelab & Network Ops Center
 * Features:
 * - Real-time system metrics with animated gauges
 * - Docker container management
 * - Network node monitoring
 * - Cloudflare DDNS status
 * - Glassmorphism UI with rainbow gradients
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import {
  fetchSystemMetrics,
  fetchContainers,
  startContainer,
  stopContainer,
  restartContainer,
  fetchNodes,
  createNode,
  deleteNode,
  fetchDDNSStatus,
  triggerDDNSSync,
} from '@/lib/api';
import {
  subscribeToMetrics,
  subscribeToContainers,
  subscribeToNetworkNodes,
} from '@/lib/firebase';
import {
  SystemMetrics,
  DockerContainer,
  NetworkNode,
  DDNSStatus,
} from '@/lib/types';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Thermometer,
  Play,
  Square,
  RotateCw,
  Plus,
  Trash2,
  RefreshCw,
  Globe,
  Activity,
  Server,
  Wifi,
  WifiOff,
  Loader2,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

// ===========================================
// Progress Ring Component
// ===========================================
function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = '#22d3ee',
  label,
  icon: Icon,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  icon: React.ElementType;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="progress-ring-circle"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={20} style={{ color }} className="mb-1" />
          <span className="text-xl font-bold text-white">
            {typeof value === 'number' ? value.toFixed(1) : '0'}
            {label !== 'Temp' ? '%' : '°C'}
          </span>
        </div>
      </div>
      <span className="mt-2 text-sm text-slate-400">{label}</span>
    </div>
  );
}

// ===========================================
// Metric Card Component
// ===========================================
function MetricCard({
  title,
  value,
  subtitle,
  color,
  className = '',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  className?: string;
}) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {subtitle && (
          <span className="ml-2 text-sm text-slate-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Container Card Component
// ===========================================
function ContainerCard({
  container,
  onAction,
}: {
  container: DockerContainer;
  onAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(action);
    await onAction(container.id, action);
    setLoading(null);
  };

  const statusColor =
    container.status === 'running'
      ? 'status-running'
      : container.status === 'exited'
      ? 'status-stopped'
      : 'status-stopped';

  return (
    <div className="glass-card glass-card-cyan p-4 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`status-dot ${statusColor}`} />
          <div>
            <h3 className="font-medium text-white">{container.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{container.image}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => handleAction('start')}
          disabled={loading !== null || container.status === 'running'}
          className="btn-success flex items-center space-x-1 text-xs disabled:opacity-50"
        >
          {loading === 'start' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          <span>Start</span>
        </button>
        
        <button
          onClick={() => handleAction('stop')}
          disabled={loading !== null || container.status !== 'running'}
          className="btn-danger flex items-center space-x-1 text-xs disabled:opacity-50"
        >
          {loading === 'stop' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Square size={14} />
          )}
          <span>Stop</span>
        </button>
        
        <button
          onClick={() => handleAction('restart')}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 flex items-center space-x-1"
        >
          {loading === 'restart' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCw size={14} />
          )}
          <span>Restart</span>
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Node Row Component
// ===========================================
function NodeRow({
  node,
  onDelete,
}: {
  node: NetworkNode;
  onDelete: (id: number) => void;
}) {
  const status = node.latest_check?.status;
  const latency = node.latest_check?.latency_ms;

  const statusColor =
    status === 'UP'
      ? 'text-emerald-400'
      : status === 'DOWN'
      ? 'text-rose-400'
      : 'text-slate-500';

  const statusDot =
    status === 'UP'
      ? 'status-up'
      : status === 'DOWN'
      ? 'status-down'
      : 'status-stopped';

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center space-x-3">
          <div className={`status-dot ${statusDot}`} />
          <span className="font-medium text-white">{node.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-slate-400 text-sm">{node.host}</td>
      <td className="py-3 px-4">
        <span className={statusColor}>{status || 'Unknown'}</span>
      </td>
      <td className="py-3 px-4 text-slate-400 text-sm">
        {latency !== null && latency !== undefined
          ? `${latency.toFixed(1)}ms`
          : '-'}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onDelete(node.id)}
          className="text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

// ===========================================
// Add Node Modal Component
// ===========================================
function AddNodeModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, host: string) => void;
}) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && host) {
      onAdd(name, host);
      setName('');
      setHost('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">Add Network Node</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="My Server"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-slate-400 mb-2">
              Host (IP or hostname)
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="192.168.1.100"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-glow">
              Add Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===========================================
// Loading Skeleton Component
// ===========================================
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="skeleton h-8 w-64 mb-2" />
          <div className="skeleton h-4 w-96" />
        </div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6">
              <div className="skeleton h-4 w-24 mb-4" />
              <div className="skeleton h-12 w-12 rounded-full mx-auto" />
              <div className="skeleton h-4 w-16 mt-4 mx-auto" />
            </div>
          ))}
        </div>
        
        {/* Table skeleton */}
        <div className="glass-card p-6">
          <div className="skeleton h-6 w-48 mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full mb-2" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================
export default function Dashboard() {
  const { user, loginWithEmail, logout } = useAuth();

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [ddnsStatus, setDdnsStatus] = useState<DDNSStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [metricsData, containersData, nodesData, ddnsData] = await Promise.allSettled([
        fetchSystemMetrics(),
        fetchContainers(),
        fetchNodes(),
        fetchDDNSStatus(),
      ]);
      
      if (metricsData.status === 'fulfilled') setMetrics(metricsData.value);
      if (containersData.status === 'fulfilled') setContainers(containersData.value);
      if (nodesData.status === 'fulfilled') setNodes(nodesData.value);
      if (ddnsData.status === 'fulfilled') setDdnsStatus(ddnsData.value);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubMetrics = subscribeToMetrics((data) => {
      if (data) {
        setMetrics((prev) => prev ? { ...prev, ...data } : null);
      }
    });

    const unsubContainers = subscribeToContainers((data) => {
      if (data) {
        const containerList = Object.values(data) as DockerContainer[];
        setContainers(containerList);
      }
    });

    return () => {
      unsubMetrics();
      unsubContainers();
    };
  }, [user]);

  // Handle container actions
  const handleContainerAction = async (
    id: string,
    action: 'start' | 'stop' | 'restart'
  ) => {
    try {
      if (action === 'start') await startContainer(id);
      else if (action === 'stop') await stopContainer(id);
      else if (action === 'restart') await restartContainer(id);
      
      // Refresh containers
      const updatedContainers = await fetchContainers();
      setContainers(updatedContainers);
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
    }
  };

  // Handle add node
  const handleAddNode = async (name: string, host: string) => {
    try {
      await createNode({ name, host });
      const updatedNodes = await fetchNodes();
      setNodes(updatedNodes);
    } catch (error) {
      console.error('Failed to add node:', error);
    }
  };

  // Handle delete node
  const handleDeleteNode = async (id: number) => {
    try {
      await deleteNode(id);
      const updatedNodes = await fetchNodes();
      setNodes(updatedNodes);
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  // Handle DDNS sync
  const handleDDNSSync = async () => {
    setSyncing(true);
    try {
      await triggerDDNSSync();
      const updatedStatus = await fetchDDNSStatus();
      setDdnsStatus(updatedStatus);
    } catch (error) {
      console.error('Failed to sync DDNS:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Handle login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError(null);
      await loginWithEmail(email, password);
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error?.code === 'auth/user-not-found') {
        setLoginError('User not found. Please contact admin.');
      } else if (error?.code === 'auth/wrong-password') {
        setLoginError('Wrong password. Please try again.');
      } else if (error?.code === 'auth/invalid-email') {
        setLoginError('Invalid email address.');
      } else if (error?.code === 'auth/too-many-requests') {
        setLoginError('Too many attempts. Please try again later.');
      } else {
        setLoginError('Login failed. Please check your credentials.');
      }
    }
  };

  // Show loading skeleton (only data loading, not auth loading)
  if (loading) {
    return <LoadingSkeleton />;
  }


  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Server size={64} className="mx-auto text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            Homelab Ops Center
          </h1>
          <p className="text-slate-400 mb-6">
            Sign in to access your dashboard
          </p>
          {loginError && (
            <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <button type="submit" className="btn-glow w-full">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Homelab Ops Center
            </h1>
            <p className="text-slate-400 mt-1">
              {`Welcome back, ${user?.displayName || user?.email}`}
            </p>

          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <Link
              href="/settings"
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors flex items-center space-x-2"
            >
              <Settings size={18} />
              <span className="hidden md:inline">Settings</span>
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* System Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Activity size={20} className="mr-2 text-cyan-400" />
            System Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* CPU Card */}
            <div className="glass-card glass-card-cyan p-6 animate-fade-in-up stagger-1">
              <ProgressRing
                value={metrics?.cpu?.percent || 0}
                color="#22d3ee"
                label="CPU"
                icon={Cpu}
              />
            </div>

            {/* RAM Card */}
            <div className="glass-card glass-card-violet p-6 animate-fade-in-up stagger-2">
              <ProgressRing
                value={metrics?.memory?.percent || 0}
                color="#a78bfa"
                label="RAM"
                icon={MemoryStick}
              />
            </div>

            {/* Disk Card */}
            <div className="glass-card glass-card-amber p-6 animate-fade-in-up stagger-3">
              <ProgressRing
                value={metrics?.disk?.percent || 0}
                color="#fbbf24"
                label="Disk"
                icon={HardDrive}
              />
            </div>

            {/* Temperature Card */}
            <div className="glass-card glass-card-rose p-6 animate-fade-in-up stagger-4">
              <ProgressRing
                value={metrics?.temperature || 0}
                max={100}
                color="#fb7185"
                label="Temp"
                icon={Thermometer}
              />
            </div>
          </div>

          {/* Detail Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <MetricCard
              title="CPU Cores"
              value={metrics?.cpu?.count || 0}
              color="#22d3ee"
            />
            <MetricCard
              title="RAM Used"
              value={formatBytes(metrics?.memory?.used || 0)}
              subtitle={`/ ${formatBytes(metrics?.memory?.total || 0)}`}
              color="#a78bfa"
            />
            <MetricCard
              title="Disk Used"
              value={formatBytes(metrics?.disk?.used || 0)}
              subtitle={`/ ${formatBytes(metrics?.disk?.total || 0)}`}
              color="#fbbf24"
            />
            <MetricCard
              title="Temperature"
              value={`${metrics?.temperature || 0}°C`}
              color="#fb7185"
            />
          </div>
        </section>

        {/* Two Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Docker Containers */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Server size={20} className="mr-2 text-cyan-400" />
              Docker Containers
            </h2>
            {containers.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500">
                No containers found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {containers.map((container) => (
                  <ContainerCard
                    key={container.id}
                    container={container}
                    onAction={handleContainerAction}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Network Nodes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Wifi size={20} className="mr-2 text-violet-400" />
                Network Nodes
              </h2>
              <button
                onClick={() => setShowAddNode(true)}
                className="btn-glow flex items-center space-x-2 text-sm"
              >
                <Plus size={16} />
                <span>Add Node</span>
              </button>
            </div>
            
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                      Host
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                      Latency
                    </th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        No nodes configured
                      </td>
                    </tr>
                  ) : (
                    nodes.map((node) => (
                      <NodeRow
                        key={node.id}
                        node={node}
                        onDelete={handleDeleteNode}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* DDNS Section */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Globe size={20} className="mr-2 text-emerald-400" />
            Cloudflare DDNS
          </h2>
          <div className="glass-card glass-card-emerald p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-slate-400">Current IP</p>
                    <p className="text-xl font-mono text-white">
                      {ddnsStatus?.public_ip || 'Loading...'}
                    </p>
                  </div>
                  {ddnsStatus?.dns_record && (
                    <div className="hidden md:block">
                      <p className="text-sm text-slate-400">DNS Record</p>
                      <p className="text-lg font-mono text-slate-300">
                        {ddnsStatus.dns_record.ip}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {ddnsStatus?.configured
                    ? `Record: ${ddnsStatus.dns_record?.name || 'N/A'}`
                    : 'DDNS not configured'}
                </p>
              </div>
              <button
                onClick={handleDDNSSync}
                disabled={syncing || !ddnsStatus?.configured}
                className="mt-4 md:mt-0 btn-glow flex items-center space-x-2 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                <span>Sync Now</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={showAddNode}
        onClose={() => setShowAddNode(false)}
        onAdd={handleAddNode}
      />
    </div>
  );
}
