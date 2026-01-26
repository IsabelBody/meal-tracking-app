const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { token?: string }
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;

  if (!API_URL) {
    return { error: 'API URL not configured' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `Request failed: ${response.status}` };
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    const data = await response.json();
    return { data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Network error';
    console.error('API request error:', error);
    return { error: msg };
  }
}
