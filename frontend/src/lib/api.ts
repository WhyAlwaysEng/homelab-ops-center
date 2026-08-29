/**
 * API Client for Homelab & Network Ops Center
 * Typed fetch wrapper for all backend endpoints
 */

import {
  SystemMetrics,
  DockerContainer,
  NetworkNode,
  LatencyLog,
  DDNSStatus,
  DDNSLog,
  NetworkStats,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Helper function for API requests
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `API request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * System Metrics API
 */
export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  return fetchAPI<SystemMetrics>('/api/system/metrics');
}

/**
 * Docker Container APIs
 */
export async function fetchContainers(): Promise<DockerContainer[]> {
  return fetchAPI<DockerContainer[]>('/api/docker/containers');
}

export async function fetchContainer(id: string): Promise<DockerContainer> {
  return fetchAPI<DockerContainer>(`/api/docker/containers/${id}`);
}

export async function startContainer(id: string): Promise<void> {
  await fetchAPI(`/api/docker/containers/${id}/start`, { method: 'POST' });
}

export async function stopContainer(id: string): Promise<void> {
  await fetchAPI(`/api/docker/containers/${id}/stop`, { method: 'POST' });
}

export async function restartContainer(id: string): Promise<void> {
  await fetchAPI(`/api/docker/containers/${id}/restart`, { method: 'POST' });
}

/**
 * Network Node APIs
 */
export async function fetchNodes(): Promise<NetworkNode[]> {
  return fetchAPI<NetworkNode[]>('/api/network/nodes');
}

export async function fetchNode(id: number): Promise<NetworkNode> {
  return fetchAPI<NetworkNode>(`/api/network/nodes/${id}`);
}

export async function createNode(data: {
  name: string;
  host: string;
  is_active?: boolean;
}): Promise<NetworkNode> {
  return fetchAPI<NetworkNode>('/api/network/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNode(
  id: number,
  data: { name?: string; host?: string; is_active?: boolean }
): Promise<NetworkNode> {
  return fetchAPI<NetworkNode>(`/api/network/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteNode(id: number): Promise<void> {
  await fetchAPI(`/api/network/nodes/${id}`, { method: 'DELETE' });
}

export async function fetchNodeLogs(
  nodeId: number,
  limit?: number,
  hours?: number
): Promise<LatencyLog[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (hours) params.append('hours', hours.toString());
  
  return fetchAPI<LatencyLog[]>(
    `/api/network/nodes/${nodeId}/logs?${params.toString()}`
  );
}

export async function checkNode(nodeId: number): Promise<any> {
  return fetchAPI(`/api/network/nodes/${nodeId}/check`, { method: 'POST' });
}

export async function fetchNetworkStats(): Promise<NetworkStats> {
  return fetchAPI<NetworkStats>('/api/network/stats');
}

/**
 * DDNS APIs
 */
export async function fetchDDNSStatus(): Promise<DDNSStatus> {
  return fetchAPI<DDNSStatus>('/api/ddns/status');
}

export async function triggerDDNSSync(): Promise<any> {
  return fetchAPI('/api/ddns/sync', { method: 'POST' });
}

export async function fetchDDNSLogs(limit?: number): Promise<DDNSLog[]> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchAPI<DDNSLog[]>(`/api/ddns/logs${params}`);
}
