/**
 * Settings API Client for Homelab & Network Ops Center
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CloudflareSettings {
  enabled: boolean;
  api_token: string;
  zone_id: string;
  record_id: string;
  record_name: string;
  check_interval: number;
}

export interface DiscordSettings {
  enabled: boolean;
  webhook_url: string;
}

export interface TelegramSettings {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
}

export interface FirebaseSettings {
  enabled: boolean;
  project_id: string;
  database_url: string;
  api_key: string;
  auth_domain: string;
}

export interface MonitoringSettings {
  ping_interval: number;
  log_retention_days: number;
  auto_retry_failed_nodes: boolean;
}

export interface GeneralSettings {
  app_name: string;
  theme: string;
  language: string;
  refresh_interval: number;
}

export interface AllSettings {
  cloudflare: CloudflareSettings;
  discord: DiscordSettings;
  telegram: TelegramSettings;
  firebase: FirebaseSettings;
  monitoring: MonitoringSettings;
  general: GeneralSettings;
}

async function fetchSettings<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API request failed: ${response.status}`);
  }

  return response.json();
}

// Get all settings
export async function getSettings(): Promise<AllSettings> {
  return fetchSettings<AllSettings>('/api/settings');
}

// Update all settings
export async function updateSettings(settings: AllSettings): Promise<any> {
  return fetchSettings('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// Update specific section
export async function updateCloudflareSettings(settings: CloudflareSettings): Promise<any> {
  return fetchSettings('/api/settings/cloudflare', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateDiscordSettings(settings: DiscordSettings): Promise<any> {
  return fetchSettings('/api/settings/discord', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateTelegramSettings(settings: TelegramSettings): Promise<any> {
  return fetchSettings('/api/settings/telegram', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateFirebaseSettings(settings: FirebaseSettings): Promise<any> {
  return fetchSettings('/api/settings/firebase', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateMonitoringSettings(settings: MonitoringSettings): Promise<any> {
  return fetchSettings('/api/settings/monitoring', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// Test connections
export async function testDiscord(): Promise<{ success: boolean; message: string }> {
  return fetchSettings('/api/settings/test-discord', { method: 'POST' });
}

export async function testTelegram(): Promise<{ success: boolean; message: string }> {
  return fetchSettings('/api/settings/test-telegram', { method: 'POST' });
}

export async function testCloudflare(): Promise<{ success: boolean; message: string }> {
  return fetchSettings('/api/settings/test-cloudflare', { method: 'POST' });
}

// Reset settings
export async function resetSettings(): Promise<any> {
  return fetchSettings('/api/settings/reset', { method: 'POST' });
}
