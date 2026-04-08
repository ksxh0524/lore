const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data as T;
}

export const api = {
  getWorld: (id: string) => request<any>(`/worlds/${id}`),
  getAgents: (worldId: string) => request<any[]>(`/worlds/${worldId}/agents`),
  getAgent: (id: string) => request<any>(`/agents/${id}`),
  sendMessage: (agentId: string, content: string) =>
    request<any>(`/agents/${agentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  initWorld: (params: any) =>
    request<any>('/worlds/init', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  pause: (worldId: string) => request<any>(`/worlds/${worldId}/pause`, { method: 'POST' }),
  resume: (worldId: string) => request<any>(`/worlds/${worldId}/resume`, { method: 'POST' }),
  getEvents: (worldId: string) => request<any[]>(`/worlds/${worldId}/events`),
  getMonitor: (worldId: string) => request<any>(`/worlds/${worldId}/monitor`),
  getPlatforms: (worldId: string) => request<any[]>(`/worlds/${worldId}/platforms`),
  switchMode: (mode: 'character' | 'god') =>
    request<any>('/mode/switch', { method: 'POST', body: JSON.stringify({ mode }) }),
};
