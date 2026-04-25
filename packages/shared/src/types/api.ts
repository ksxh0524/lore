export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorBody {
  code: number;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

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
  category: 'fulltime' | 'parttime' | 'freelance' | 'intern';
  salary: number;
  salaryFrequency: 'daily' | 'weekly' | 'monthly';
  energyCost: number;
  moodEffect: number;
  description?: string;
}

export interface AgentEconomy {
  balance: number;
  income: number;
  expenses: number;
}

export interface WorldListItem {
  id: string;
  name: string;
  type: 'random' | 'history';
  status: 'initializing' | 'running' | 'paused' | 'stopped';
  createdAt: string;
}