const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3952';

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  effect: Record<string, number>;
  description: string;
}

export interface Job {
  id: string;
  name: string;
  category: string;
  salary: number;
  salaryFrequency: string;
  energyCost: number;
  moodEffect: number;
  description?: string;
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API error');
  return data.data as T;
}

export const api = {
  getShopItems: () => fetchAPI<ShopItem[]>('/api/shop/items'),
  getShopItemsByCategory: (category: string) => fetchAPI<ShopItem[]>(`/api/shop/items/${category}`),
  buyItem: (agentId: string, itemId: string) =>
    fetchAPI<{ success: boolean; newBalance: number }>(`/api/agents/${agentId}/buy`, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  getJobs: () => fetchAPI<Job[]>('/api/jobs'),
  getJobsByCategory: (category: string) => fetchAPI<Job[]>(`/api/jobs/${category}`),
  canApplyJob: (agentId: string, jobId: string) =>
    fetchAPI<{ canApply: boolean }>(`/api/agents/${agentId}/can-apply/${jobId}`),
  applyJob: (agentId: string, jobId: string) =>
    fetchAPI<{ success: boolean; job: Job }>(`/api/agents/${agentId}/apply-job`, {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),
  quitJob: (agentId: string) =>
    fetchAPI<{ success: boolean }>(`/api/agents/${agentId}/quit-job`, {
      method: 'POST',
    }),

  getAgentEconomy: (agentId: string) =>
    fetchAPI<{ balance: number; income: number; expenses: number }>(`/api/agents/${agentId}/economy`),
};