/**
 * Production-Grade API Client with Silent Token Refresh & Request Queueing
 * Implements RFC 6749 / RFC 6750 Token Rotation and automatic request replay.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const TOKEN_STORAGE_KEY = 'triptual_auth_token';
export const REFRESH_TOKEN_KEY = 'triptual_refresh_token';
export const USER_STORAGE_KEY = 'triptual_auth_user';

export interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Execute silent token refresh with the backend
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE}/users/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.data?.accessToken) {
    const errorMsg = data?.err?.message || data?.message || 'Failed to refresh token';
    // Clear invalid session
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
    throw new Error(errorMsg);
  }

  const newAccessToken = data.data.accessToken;
  const newRefreshToken = data.data.refreshToken;

  localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
  if (newRefreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
  }

  return newAccessToken;
}

/**
 * Main authenticated API request handler with automatic token rotation & replay
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, skipAuthRefresh = false, ...restOptions } = options;

  const getHeaders = (authToken?: string | null): Record<string, string> => {
    const activeToken = authToken !== undefined ? authToken : (token || localStorage.getItem(TOKEN_STORAGE_KEY));
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };
    if (activeToken) {
      h['Authorization'] = `Bearer ${activeToken}`;
    }
    return h;
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...restOptions,
      headers: getHeaders(),
      credentials: 'include',
    });
  } catch (netErr: any) {
    console.error('API network error:', netErr);
    const error = new Error('Cannot connect to backend server. Please verify port 4000.');
    (error as any).status = 503;
    throw error;
  }

  // Handle Token Expiry (401 / 403 Access Denied) with Silent Refresh & Replay
  if ((response.status === 401 || response.status === 403) && !skipAuthRefresh && !endpoint.includes('/users/login') && !endpoint.includes('/users/refresh')) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (refreshToken) {
      if (isRefreshing) {
        // If already refreshing, wait for new token and replay
        try {
          const newToken = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });

          const retryRes = await fetch(`${API_BASE}${endpoint}`, {
            ...restOptions,
            headers: getHeaders(newToken),
            credentials: 'include',
          });
          return parseResponse<T>(retryRes);
        } catch (err) {
          throw err;
        }
      }

      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();
        processQueue(null, newAccessToken);

        // Replay original request with refreshed token
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...restOptions,
          headers: getHeaders(newAccessToken),
          credentials: 'include',
        });
        return parseResponse<T>(retryRes);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText || 'Failed to parse JSON' };
    }
  } else {
    const text = await response.text();
    data = { message: text || response.statusText };
  }

  if (!response.ok) {
    const errorMessage =
      data?.err?.message ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
      (Array.isArray(data?.data?.errors) ? data.data.errors.join(', ') : null) ||
      (typeof data?.err === 'string' ? data.err : null) ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
