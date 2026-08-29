'use client';

/**
 * Settings Page for Homelab & Network Ops Center
 * Manages all application configuration
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSettings,
  updateSettings,
  testDiscord,
  testTelegram,
  testCloudflare,
  resetSettings,
  AllSettings,
  CloudflareSettings,
  DiscordSettings,
  TelegramSettings,
  FirebaseSettings,
  MonitoringSettings,
  GeneralSettings,
} from '@/lib/settings-api';
import {
  Settings,
  Globe,
  MessageSquare,
  Send,
  Bell,
  Database,
  Activity,
  Save,
  RotateCcw,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  TestTube,
  ExternalLink,
  Copy,
} from 'lucide-react';

// ===========================================
// Toggle Switch Component
// ===========================================
function ToggleSwitch({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <label className="text-sm font-medium text-white">{label}</label>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-cyan-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

// ===========================================
// Input Field Component
// ===========================================
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
  disabled,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

// ===========================================
// Number Input Component
// ===========================================
function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
      />
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </div>
  );
}

// ===========================================
// Settings Section Component
// ===========================================
function SettingsSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  color = 'cyan',
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    rose: 'text-rose-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon size={20} className={colorMap[color] || 'text-cyan-400'} />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown size={18} className="text-slate-400" />
        ) : (
          <ChevronRight size={18} className="text-slate-400" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-slate-800">{children}</div>}
    </div>
  );
}

// ===========================================
// Status Toast Component
// ===========================================
function StatusToast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'loading';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'success'
      ? 'bg-emerald-500/20 border-emerald-500/50'
      : type === 'error'
      ? 'bg-rose-500/20 border-rose-500/50'
      : 'bg-cyan-500/20 border-cyan-500/50';

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg border ${bgColor} flex items-center space-x-2 animate-fade-in-up`}
    >
      {type === 'success' && <Check size={18} className="text-emerald-400" />}
      {type === 'error' && <X size={18} className="text-rose-400" />}
      {type === 'loading' && (
        <Loader2 size={18} className="text-cyan-400 animate-spin" />
      )}
      <span className="text-sm text-white">{message}</span>
    </div>
  );
}

// ===========================================
// Main Settings Page
// ===========================================
export default function SettingsPage() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'loading';
  } | null>(null);

  // Check demo mode on mount
  useEffect(() => {
    const isDemo = localStorage.getItem('homelab_demo_mode') === 'true';
    setDemoMode(isDemo);
  }, []);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults if API not available
      setSettings({
        cloudflare: { enabled: false, api_token: '', zone_id: '', record_id: '', record_name: '', check_interval: 300 },
        discord: { enabled: false, webhook_url: '' },
        telegram: { enabled: false, bot_token: '', chat_id: '' },
        firebase: { enabled: false, project_id: '', database_url: '', api_key: '', auth_domain: '' },
        monitoring: { ping_interval: 30, log_retention_days: 3, auto_retry_failed_nodes: true },
        general: { app_name: 'Homelab Ops Center', theme: 'dark', language: 'en', refresh_interval: 5 },
      });
    } finally {
      setLoading(false);
    }
  };

  // Save all settings
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      setToast({ message: 'Settings saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTest = async (service: 'discord' | 'telegram' | 'cloudflare') => {
    setTesting(service);
    try {
      let result;
      if (service === 'discord') result = await testDiscord();
      else if (service === 'telegram') result = await testTelegram();
      else result = await testCloudflare();

      setToast({
        message: result.message,
        type: result.success ? 'success' : 'error',
      });
    } catch (error) {
      setToast({ message: 'Test failed', type: 'error' });
    } finally {
      setTesting(null);
    }
  };

  // Reset settings
  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    try {
      await resetSettings();
      await loadSettings();
      setToast({ message: 'Settings reset to defaults', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to reset settings', type: 'error' });
    }
  };

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Loader2 size={40} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated and not in demo mode
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <Settings size={64} className="mx-auto text-cyan-400 mb-6" />
          <h1 className="text-2xl font-bold gradient-text mb-2">Settings</h1>
          <p className="text-slate-400 mb-6">Sign in to access settings</p>
          <button onClick={loginWithGoogle} className="btn-glow w-full mb-3">
            Sign in with Google
          </button>
          <button
            onClick={() => {
              setDemoMode(true);
              localStorage.setItem('homelab_demo_mode', 'true');
            }}
            className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700/60 hover:text-white transition-all duration-300"
          >
            Enter Demo Mode
          </button>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Settings</h1>
            <p className="text-slate-400 mt-1">
              Configure your Homelab Ops Center
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-glow flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* ===== General Settings ===== */}
          <SettingsSection
            title="General"
            icon={Settings}
            color="cyan"
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="App Name"
                value={settings.general.app_name}
                onChange={(v) =>
                  setSettings({ ...settings, general: { ...settings.general, app_name: v } })
                }
                placeholder="Homelab Ops Center"
              />
              <NumberInput
                label="Dashboard Refresh Interval (seconds)"
                value={settings.general.refresh_interval}
                onChange={(v) =>
                  setSettings({ ...settings, general: { ...settings.general, refresh_interval: v } })
                }
                min={1}
                max={60}
                description="How often the dashboard auto-refreshes"
              />
            </div>
          </SettingsSection>

          {/* ===== Cloudflare DDNS ===== */}
          <SettingsSection
            title="Cloudflare DDNS"
            icon={Globe}
            color="amber"
            defaultOpen={true}
          >
            <ToggleSwitch
              enabled={settings.cloudflare.enabled}
              onChange={(v) =>
                setSettings({ ...settings, cloudflare: { ...settings.cloudflare, enabled: v } })
              }
              label="Enable Cloudflare DDNS"
              description="Auto-update DNS records when your IP changes"
            />
            
            <div className={`space-y-1 ${!settings.cloudflare.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <InputField
                label="API Token"
                value={settings.cloudflare.api_token}
                onChange={(v) =>
                  setSettings({ ...settings, cloudflare: { ...settings.cloudflare, api_token: v } })
                }
                placeholder="your-cloudflare-api-token"
                description="Create at dash.cloudflare.com → My Profile → API Tokens"
              />
              <InputField
                label="Zone ID"
                value={settings.cloudflare.zone_id}
                onChange={(v) =>
                  setSettings({ ...settings, cloudflare: { ...settings.cloudflare, zone_id: v } })
                }
                placeholder="your-zone-id"
                description="Found on the right side of your domain's DNS page"
              />
              <InputField
                label="Record ID"
                value={settings.cloudflare.record_id}
                onChange={(v) =>
                  setSettings({ ...settings, cloudflare: { ...settings.cloudflare, record_id: v } })
                }
                placeholder="your-record-id"
                description="Found in the DNS record details"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Record Name"
                  value={settings.cloudflare.record_name}
                  onChange={(v) =>
                    setSettings({ ...settings, cloudflare: { ...settings.cloudflare, record_name: v } })
                  }
                  placeholder="homelab.yourdomain.com"
                />
                <NumberInput
                  label="Check Interval (seconds)"
                  value={settings.cloudflare.check_interval}
                  onChange={(v) =>
                    setSettings({ ...settings, cloudflare: { ...settings.cloudflare, check_interval: v } })
                  }
                  min={60}
                  max={3600}
                />
              </div>
              
              <button
                onClick={() => handleTest('cloudflare')}
                disabled={testing === 'cloudflare' || !settings.cloudflare.api_token}
                className="mt-2 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {testing === 'cloudflare' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <TestTube size={14} />
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </SettingsSection>

          {/* ===== Discord Notifications ===== */}
          <SettingsSection
            title="Discord Notifications"
            icon={MessageSquare}
            color="violet"
          >
            <ToggleSwitch
              enabled={settings.discord.enabled}
              onChange={(v) =>
                setSettings({ ...settings, discord: { ...settings.discord, enabled: v } })
              }
              label="Enable Discord Alerts"
              description="Send alerts to Discord when nodes go down/up"
            />
            
            <div className={`${!settings.discord.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <InputField
                label="Webhook URL"
                value={settings.discord.webhook_url}
                onChange={(v) =>
                  setSettings({ ...settings, discord: { ...settings.discord, webhook_url: v } })
                }
                placeholder="https://discord.com/api/webhooks/..."
                description="Server Settings → Integrations → Webhooks → New Webhook"
              />
              
              <button
                onClick={() => handleTest('discord')}
                disabled={testing === 'discord' || !settings.discord.webhook_url}
                className="mt-2 px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/30 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {testing === 'discord' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <TestTube size={14} />
                )}
                <span>Send Test Notification</span>
              </button>
            </div>
          </SettingsSection>

          {/* ===== Telegram Notifications ===== */}
          <SettingsSection
            title="Telegram Notifications"
            icon={Send}
            color="blue"
          >
            <ToggleSwitch
              enabled={settings.telegram.enabled}
              onChange={(v) =>
                setSettings({ ...settings, telegram: { ...settings.telegram, enabled: v } })
              }
              label="Enable Telegram Alerts"
              description="Send alerts via Telegram bot"
            />
            
            <div className={`${!settings.telegram.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Bot Token"
                  value={settings.telegram.bot_token}
                  onChange={(v) =>
                    setSettings({ ...settings, telegram: { ...settings.telegram, bot_token: v } })
                  }
                  placeholder="123456789:ABCdef..."
                  description="Get from @BotFather on Telegram"
                />
                <InputField
                  label="Chat ID"
                  value={settings.telegram.chat_id}
                  onChange={(v) =>
                    setSettings({ ...settings, telegram: { ...settings.telegram, chat_id: v } })
                  }
                  placeholder="123456789"
                  description="Get from @userinfobot on Telegram"
                />
              </div>
              
              <button
                onClick={() => handleTest('telegram')}
                disabled={testing === 'telegram' || !settings.telegram.bot_token}
                className="mt-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {testing === 'telegram' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <TestTube size={14} />
                )}
                <span>Send Test Notification</span>
              </button>
            </div>
          </SettingsSection>

          {/* ===== Firebase ===== */}
          <SettingsSection
            title="Firebase"
            icon={Database}
            color="rose"
          >
            <ToggleSwitch
              enabled={settings.firebase.enabled}
              onChange={(v) =>
                setSettings({ ...settings, firebase: { ...settings.firebase, enabled: v } })
              }
              label="Enable Firebase"
              description="Real-time updates and Google Authentication"
            />
            
            <div className={`${!settings.firebase.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <InputField
                label="Project ID"
                value={settings.firebase.project_id}
                onChange={(v) =>
                  setSettings({ ...settings, firebase: { ...settings.firebase, project_id: v } })
                }
                placeholder="your-firebase-project-id"
              />
              <InputField
                label="Database URL"
                value={settings.firebase.database_url}
                onChange={(v) =>
                  setSettings({ ...settings, firebase: { ...settings.firebase, database_url: v } })
                }
                placeholder="https://your-project-default-rtdb.firebaseio.com"
              />
              <InputField
                label="API Key"
                value={settings.firebase.api_key}
                onChange={(v) =>
                  setSettings({ ...settings, firebase: { ...settings.firebase, api_key: v } })
                }
                placeholder="AIza..."
              />
              <InputField
                label="Auth Domain"
                value={settings.firebase.auth_domain}
                onChange={(v) =>
                  setSettings({ ...settings, firebase: { ...settings.firebase, auth_domain: v } })
                }
                placeholder="your-project.firebaseapp.com"
              />
            </div>
          </SettingsSection>

          {/* ===== Monitoring Settings ===== */}
          <SettingsSection
            title="Network Monitoring"
            icon={Activity}
            color="emerald"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                label="Ping Interval (seconds)"
                value={settings.monitoring.ping_interval}
                onChange={(v) =>
                  setSettings({ ...settings, monitoring: { ...settings.monitoring, ping_interval: v } })
                }
                min={10}
                max={300}
                description="How often to ping monitored nodes"
              />
              <NumberInput
                label="Log Retention (days)"
                value={settings.monitoring.log_retention_days}
                onChange={(v) =>
                  setSettings({ ...settings, monitoring: { ...settings.monitoring, log_retention_days: v } })
                }
                min={1}
                max={365}
                description="Delete logs older than this"
              />
            </div>
            <ToggleSwitch
              enabled={settings.monitoring.auto_retry_failed_nodes}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  monitoring: { ...settings.monitoring, auto_retry_failed_nodes: v },
                })
              }
              label="Auto-retry Failed Nodes"
              description="Automatically retry pinging failed nodes"
            />
          </SettingsSection>

          {/* ===== Quick Links ===== */}
          <SettingsSection
            title="Quick Links"
            icon={ExternalLink}
            color="cyan"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors text-sm text-slate-300 hover:text-white"
              >
                <ExternalLink size={16} />
                <span>Firebase Console</span>
              </a>
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors text-sm text-slate-300 hover:text-white"
              >
                <ExternalLink size={16} />
                <span>Cloudflare Dashboard</span>
              </a>
              <a
                href="https://discord.com/app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors text-sm text-slate-300 hover:text-white"
              >
                <ExternalLink size={16} />
                <span>Discord Developer Portal</span>
              </a>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors text-sm text-slate-300 hover:text-white"
              >
                <ExternalLink size={16} />
                <span>Telegram BotFather</span>
              </a>
            </div>
          </SettingsSection>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <StatusToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
