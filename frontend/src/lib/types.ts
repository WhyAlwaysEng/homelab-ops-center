/**
 * Type definitions for Homelab & Network Ops Center
 * These types match the backend Pydantic models
 */

// System Metrics
export interface SystemMetrics {
  cpu: {
    percent: number;
    count: number;
    frequency: {
      current: number | null;
      min: number | null;
      max: number | null;
    } | null;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  temperature: number | null;
  timestamp: string;
}

// Docker Container
export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  image: string;
  created: string;
  state: string;
  health: string;
}

// Network Node
export interface NetworkNode {
  id: number;
  name: string;
  host: string;
  is_active: boolean;
  created_at: string;
  latest_check?: {
    status: 'UP' | 'DOWN' | null;
    latency_ms: number | null;
    packet_loss_pct: number | null;
    checked_at: string | null;
  } | null;
  stats_24h?: {
    uptime_pct: number;
    total_checks: number;
    avg_latency: number | null;
    min_latency: number | null;
    max_latency: number | null;
  } | null;
}

// Latency Log
export interface LatencyLog {
  id: number;
  node_id: number;
  latency_ms: number | null;
  packet_loss_pct: number;
  status: 'UP' | 'DOWN';
  checked_at: string;
}

// DDNS Status
export interface DDNSStatus {
  public_ip: string | null;
  dns_record: {
    name: string;
    ip: string | null;
    proxied: boolean;
  } | null;
  configured: boolean;
}

// DDNS Log
export interface DDNSLog {
  id: number;
  old_ip: string | null;
  new_ip: string;
  record_name: string;
  updated_at: string;
}

// Network Stats
export interface NetworkStats {
  total_nodes: number;
  active_nodes: number;
  up_count: number;
  down_count: number;
  nodes: {
    id: number;
    name: string;
    host: string;
    status: 'UP' | 'DOWN' | null;
    latency_ms: number | null;
  }[];
}

// API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Auth User
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
