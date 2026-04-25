import type {
  ApiResponse,
  ApiErrorBody,
  WorldListItem,
  InitRequest,
  InitResult,
  SerializedAgent,
  ProviderPreset,
  UserProvider,
  CreateProviderRequest,
  UpdateProviderRequest,
  TestProviderResponse,
  ShopItem,
  Job,
  AgentEconomy,
} from '@lore/shared';

const API_BASE = '/api';

class ApiError extends Error {
  code: number;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const hasBody = options?.body !== undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(json.error);
  }

  return json.data as T;
}

async function* streamRequest(path: string, body: unknown): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = await res.json();
    throw new ApiError(json.error);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.chunk) yield data.chunk;
        if (data.done) return;
      }
    }
  }
}

export const world = {
  list: (): Promise<WorldListItem[]> => request('/worlds'),
  get: (id: string): Promise<WorldListItem> => request(`/worlds/${id}`),
  init: (params: InitRequest): Promise<InitResult> => request('/worlds/init', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
  pause: (id: string): Promise<void> => request(`/worlds/${id}/pause`, { method: 'POST' }),
  resume: (id: string): Promise<void> => request(`/worlds/${id}/resume`, { method: 'POST' }),
  delete: (id: string): Promise<void> => request(`/worlds/${id}`, { method: 'DELETE' }),
  save: (id: string, name?: string): Promise<{ saveId: string }> => request(`/worlds/${id}/save`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  listSaves: (id: string): Promise<{ id: string; name: string; createdAt: string }[]> => request(`/worlds/${id}/saves`),
};

export const agent = {
  list: (worldId: string): Promise<SerializedAgent[]> => request(`/worlds/${worldId}/agents`),
  get: (id: string): Promise<SerializedAgent> => request(`/agents/${id}`),
  chat: (id: string, content: string): Promise<{ content: string }> => request(`/agents/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  chatStream: (id: string, content: string): AsyncGenerator<string> => streamRequest(`/agents/${id}/chat`, { content }),
  relationships: (id: string): Promise<{ targetId: string; type: string; intimacy: number }[]> => request(`/agents/${id}/relationships`),
};

export const economy = {
  get: (agentId: string): Promise<AgentEconomy> => request(`/agents/${agentId}/economy`),
  spend: (agentId: string, amount: number, reason: string): Promise<void> => request(`/agents/${agentId}/economy/spend`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  }),
  earn: (agentId: string, amount: number, reason: string): Promise<void> => request(`/agents/${agentId}/economy/earn`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  }),
};

export const shop = {
  list: (): Promise<ShopItem[]> => request('/shop/items'),
  byCategory: (category: string): Promise<ShopItem[]> => request(`/shop/items/${category}`),
  buy: (agentId: string, itemId: string): Promise<{ success: boolean; newBalance: number }> => request(`/agents/${agentId}/buy`, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  }),
};

export const job = {
  list: (): Promise<Job[]> => request('/jobs'),
  byCategory: (category: string): Promise<Job[]> => request(`/jobs/${category}`),
  canApply: (agentId: string, jobId: string): Promise<{ canApply: boolean }> => request(`/agents/${agentId}/can-apply/${jobId}`),
  apply: (agentId: string, jobId: string): Promise<{ success: boolean; job: Job }> => request(`/agents/${agentId}/apply-job`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  }),
  quit: (agentId: string): Promise<{ success: boolean }> => request(`/agents/${agentId}/quit-job`, { method: 'POST' }),
};

export const provider = {
  listPresets: (): Promise<ProviderPreset[]> => request('/provider-presets'),
  list: (): Promise<UserProvider[]> => request('/providers'),
  get: (id: string): Promise<UserProvider> => request(`/providers/${id}`),
  create: (data: CreateProviderRequest): Promise<UserProvider> => request('/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: UpdateProviderRequest): Promise<UserProvider> => request(`/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string): Promise<void> => request(`/providers/${id}`, { method: 'DELETE' }),
  test: (id: string): Promise<TestProviderResponse> => request(`/providers/${id}/test`, { method: 'POST' }),
  fetchModels: (presetId: string, apiKey: string): Promise<{ models: string[] }> => request(`/provider-presets/${presetId}/fetch-models`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  }),
};

export const platform = {
  list: (worldId: string): Promise<{ id: string; name: string; type: string }[]> => request(`/worlds/${worldId}/platforms`),
  feed: (platformId: string): Promise<{ id: string; authorId: string; content: string; likes: number; createdAt: string }[]> => request(`/platforms/${platformId}/feed`),
  post: (platformId: string, content: string, imageUrl?: string): Promise<{ id: string }> => request('/user/posts', {
    method: 'POST',
    body: JSON.stringify({ platformId, content, imageUrl }),
  }),
  like: (postId: string, agentId?: string): Promise<void> => request(`/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  }),
  comment: (postId: string, authorId: string, content: string): Promise<void> => request(`/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ authorId, content }),
  }),
};

export const event = {
  list: (worldId: string): Promise<{ id: string; type: string; description: string; timestamp: string }[]> => request(`/worlds/${worldId}/events`),
};

export { ApiError };