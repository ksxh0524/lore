import type { 
  ProviderPreset, 
  UserProvider, 
  CreateProviderRequest, 
  UpdateProviderRequest,
  TestProviderResponse 
} from '@lore/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Provider API
export const providerApi = {
  // Get all presets
  getPresets: (): Promise<{ data: ProviderPreset[] }> => 
    fetchJson('/provider-presets'),
  
  // Get all user providers
  getProviders: (): Promise<{ data: UserProvider[] }> => 
    fetchJson('/providers'),
  
  // Get single provider
  getProvider: (id: string): Promise<{ data: UserProvider }> => 
    fetchJson(`/providers/${id}`),
  
  // Create new provider
  createProvider: (data: CreateProviderRequest): Promise<{ data: { id: string } }> => 
    fetchJson('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Update provider
  updateProvider: (id: string, data: UpdateProviderRequest): Promise<void> => 
    fetchJson(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // Delete provider
  deleteProvider: (id: string): Promise<void> => 
    fetchJson(`/providers/${id}`, {
      method: 'DELETE',
    }),
  
  // Test provider connection
  testProvider: (id: string): Promise<{ data: TestProviderResponse }> => 
    fetchJson(`/providers/${id}/test`, {
      method: 'POST',
    }),
};

// World API
export const api = {
  getWorlds: async (): Promise<Array<{ id: string; name: string; type: 'random' | 'history'; status: string; createdAt: string }>> => {
    const response = await fetch('/api/worlds');
    if (!response.ok) throw new Error('Failed to get worlds');
    const data = await response.json();
    return data.data || [];
  },

  initWorld: async (params: { worldType: 'random' | 'history'; randomParams?: { age: number; location: string; background: string }; historyParams?: { presetName: string; targetCharacter?: string } }): Promise<{ worldId: string }> => {
    const response = await fetch('/api/worlds/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to init world');
    const data = await response.json();
    return { worldId: data.data.worldId };
  },
  
  getAgents: async (worldId: string): Promise<Array<{ id: string; profile: { name: string; age: number; occupation: string }; stats: { mood: number; health: number; energy: number; money: number }; state: { status: string; currentActivity: string } }>> => {
    const response = await fetch(`/api/worlds/${worldId}/agents`);
    if (!response.ok) throw new Error('Failed to get agents');
    const data = await response.json();
    return data.agents || [];
  },
  
  pause: async (worldId: string): Promise<void> => {
    await fetch(`/api/worlds/${worldId}/pause`, { method: 'POST' });
  },
  
  resume: async (worldId: string): Promise<void> => {
    await fetch(`/api/worlds/${worldId}/resume`, { method: 'POST' });
  },
  
  streamChat: async function* (agentId: string, content: string): AsyncGenerator<string> {
    const response = await fetch(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  },
  
  sendMessage: async (agentId: string, content: string): Promise<{ content: string }> => {
    const response = await fetch(`/api/agents/${agentId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },
};
