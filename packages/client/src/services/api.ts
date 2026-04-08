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
  streamChat: async function* (agentId: string, content: string): AsyncGenerator<string> {
    const res = await fetch(`${BASE}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.body) throw new Error('No stream body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const match = line.match(/^data: (.+)$/);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.chunk) yield parsed.chunk;
            if (parsed.done) return;
          } catch {}
        }
      }
    }
  },
  initWorld: (params: any) =>
    request<any>('/worlds/init', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  pause: (worldId: string) => request<any>(`/worlds/${worldId}/pause`, { method: 'POST' }),
  resume: (worldId: string) => request<any>(`/worlds/${worldId}/resume`, { method: 'POST' }),
  setSpeed: (worldId: string, speed: number) =>
    request<any>(`/worlds/${worldId}/speed`, {
      method: 'POST',
      body: JSON.stringify({ speed }),
    }),
  getEvents: (worldId: string) => request<any[]>(`/worlds/${worldId}/events`),
  getMonitor: (worldId: string) => request<any>(`/worlds/${worldId}/monitor`),
  getPlatforms: (worldId: string) => request<any[]>(`/worlds/${worldId}/platforms`),
  getPlatformFeed: (platformId: string) => request<any[]>(`/platforms/${platformId}/feed`),
  getAllPosts: (worldId: string) => request<any[]>(`/worlds/${worldId}/platforms/all`),
  likePost: (postId: string, agentId?: string) =>
    request<any>(`/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ agentId: agentId ?? 'user' }),
    }),
  commentPost: (postId: string, authorId: string, content: string) =>
    request<any>(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ authorId, content }),
    }),
  agentPost: (agentId: string, content: string, platformId?: string) =>
    request<any>(`/agents/${agentId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ content, platformId }),
    }),
  saveWorld: (worldId: string, name?: string) =>
    request<any>(`/worlds/${worldId}/save`, {
      method: 'POST',
      body: JSON.stringify({ name: name ?? `save-${Date.now()}` }),
    }),
  getSaves: (worldId: string) => request<any[]>(`/worlds/${worldId}/saves`),
  loadSave: (saveId: string) => request<any>(`/saves/${saveId}/load`, { method: 'POST' }),
  deleteSave: (saveId: string) => request<any>(`/saves/${saveId}`, { method: 'DELETE' }),
  getGodAgents: (worldId: string) => request<any[]>(`/god/world/${worldId}/agents`),
  getGodAgent: (agentId: string) => request<any>(`/god/agent/${agentId}`),
  godTriggerEvent: (category: string, description: string, severity?: number) =>
    request<any>('/god/trigger-event', {
      method: 'POST',
      body: JSON.stringify({ category, description, severity: severity ?? 5 }),
    }),
  chooseEventOption: (eventId: string, optionId: string) =>
    request<any>(`/events/${eventId}/choose`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),
  switchMode: (mode: 'character' | 'god') =>
    request<any>('/mode/switch', { method: 'POST', body: JSON.stringify({ mode }) }),
  createPost: (platformId: string, content: string, imageUrl?: string) =>
    request<any>('/user/posts', {
      method: 'POST',
      body: JSON.stringify({ platformId, content, imageUrl: imageUrl ?? '' }),
    }),
  getEconomy: (agentId: string) => request<any>(`/agents/${agentId}/economy`),
  getRelationships: (agentId: string) => request<any[]>(`/agents/${agentId}/relationships`),
  getAgentMessages: (agentId: string) => request<any[]>(`/agents/${agentId}/messages`),
  getFactions: (worldId: string) => request<any[]>(`/worlds/${worldId}/factions`),
  createFaction: (worldId: string, name: string, description: string, leaderId: string) =>
    request<any>(`/worlds/${worldId}/factions`, {
      method: 'POST',
      body: JSON.stringify({ name, description, leaderId }),
    }),
};
