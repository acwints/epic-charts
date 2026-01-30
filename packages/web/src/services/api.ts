const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for auth
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export async function getAuthUrl(target?: string): Promise<{ auth_url: string }> {
  const params = target ? `?target=${encodeURIComponent(target)}` : '';
  return apiRequest(`/auth/google${params}`);
}

export async function setAuthCookie(token: string): Promise<void> {
  await apiRequest(`/api/auth/set-cookie?token=${encodeURIComponent(token)}`, { method: 'POST' });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' });
}

// User
export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest('/api/user/me');
}

// Charts
export interface ChartResponse {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  data: {
    labels: string[];
    series: { name: string; data: number[] }[];
    suggestedType?: string;
    suggestedTitle?: string;
  };
  config: {
    type: string;
    colorScheme: string;
    styleVariant: string;
    showGrid: boolean;
    showLegend: boolean;
    showValues: boolean;
    animate: boolean;
    title?: string;
  };
  source_type: string | null;
  is_public: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  is_liked: boolean;
  is_saved: boolean;
  user?: User;
}

export interface ChartListResponse {
  charts: ChartResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateChartData {
  title?: string;
  description?: string;
  data: {
    labels: string[];
    series: { name: string; data: number[] }[];
    suggestedType?: string;
    suggestedTitle?: string;
  };
  config: {
    type: string;
    colorScheme: string;
    styleVariant: string;
    showGrid: boolean;
    showLegend: boolean;
    showValues: boolean;
    animate: boolean;
    title?: string;
  };
  source_type?: string;
  is_public?: boolean;
}

export async function createChart(data: CreateChartData): Promise<ChartResponse> {
  return apiRequest('/api/charts', { method: 'POST', body: data });
}

export async function getMyCharts(limit = 20, offset = 0): Promise<ChartListResponse> {
  return apiRequest(`/api/charts?limit=${limit}&offset=${offset}`);
}

export async function getPublicCharts(limit = 20, offset = 0): Promise<ChartListResponse> {
  return apiRequest(`/api/charts/public?limit=${limit}&offset=${offset}`);
}

export async function getChart(chartId: string): Promise<ChartResponse> {
  return apiRequest(`/api/charts/${chartId}`);
}

export async function updateChart(chartId: string, data: Partial<CreateChartData>): Promise<ChartResponse> {
  return apiRequest(`/api/charts/${chartId}`, { method: 'PUT', body: data });
}

export async function deleteChart(chartId: string): Promise<void> {
  await apiRequest(`/api/charts/${chartId}`, { method: 'DELETE' });
}

// Save/Bookmark
export async function saveChart(chartId: string): Promise<void> {
  await apiRequest(`/api/charts/${chartId}/save`, { method: 'POST' });
}

export async function unsaveChart(chartId: string): Promise<void> {
  await apiRequest(`/api/charts/${chartId}/save`, { method: 'DELETE' });
}

export async function getSavedCharts(): Promise<{ id: string; chart_id: string; chart: ChartResponse }[]> {
  return apiRequest('/api/saved');
}

// Like
export async function likeChart(chartId: string): Promise<void> {
  await apiRequest(`/api/charts/${chartId}/like`, { method: 'POST' });
}

export async function unlikeChart(chartId: string): Promise<void> {
  await apiRequest(`/api/charts/${chartId}/like`, { method: 'DELETE' });
}

export async function getLikedCharts(): Promise<ChartResponse[]> {
  return apiRequest('/api/liked');
}

// Health check
export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest('/health');
}
