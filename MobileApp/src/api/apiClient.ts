/**
 * Production-Grade API Client for MobileApp
 * Live Backend: https://hackcelestial-api.onrender.com/api
 * Features: Silent Token Rotation, Request Replay, Network Timeout Handling
 */

import { Platform } from 'react-native';
import { storage } from '../database/storage';

export const getApiBase = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }
  return 'http://127.0.0.1:4000/api';
};

export const API_BASE = getApiBase();
export const FALLBACK_API_BASE = 'http://192.168.0.113:4000/api';

export interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
  timeoutMs?: number;
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
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetchWithTimeout(`${API_BASE}/users/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    timeoutMs: 12000,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.data?.accessToken) {
    const errorMsg = data?.err?.message || data?.message || 'Failed to refresh token';
    await storage.clearSession();
    throw new Error(errorMsg);
  }

  const newAccessToken = data.data.accessToken;
  const newRefreshToken = data.data.refreshToken;

  await storage.setAuthToken(newAccessToken);
  if (newRefreshToken) {
    await storage.setRefreshToken(newRefreshToken);
  }

  return newAccessToken;
}

/**
 * Fetch wrapper with configurable abort timeout and fallback URL retry
 */
async function fetchWithTimeout(url: string, options: RequestOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    // If primary URL failed and wasn't explicit fallback URL, attempt fallback API base
    if (url.startsWith(API_BASE) && API_BASE !== FALLBACK_API_BASE) {
      const fallbackUrl = url.replace(API_BASE, FALLBACK_API_BASE);
      try {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeoutMs);
        const fallbackRes = await fetch(fallbackUrl, {
          ...fetchOptions,
          signal: fallbackController.signal,
        });
        clearTimeout(fallbackTimeout);
        return fallbackRes;
      } catch (fallbackErr) {
        // Ignore fallback error and throw original error
      }
    }
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Network request timed out. Please check your connection.');
      (timeoutError as any).status = 408;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main authenticated API request handler
 */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, skipAuthRefresh = false, ...restOptions } = options;

  const getHeaders = async (authToken?: string | null): Promise<Record<string, string>> => {
    const activeToken = authToken !== undefined ? authToken : (token || await storage.getAuthToken());
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
    const reqHeaders = await getHeaders();
    response = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      ...restOptions,
      headers: reqHeaders,
    });
  } catch (netErr: any) {
    const error = new Error(netErr.message || 'Cannot connect to backend server. Running in offline mode.');
    (error as any).status = 503;
    (error as any).isOffline = true;
    throw error;
  }

  // Handle Token Expiry (401 / 403) with Silent Refresh & Replay
  if (
    (response.status === 401 || response.status === 403) &&
    !skipAuthRefresh &&
    !endpoint.includes('/users/login') &&
    !endpoint.includes('/users/refresh')
  ) {
    const refreshToken = await storage.getRefreshToken();

    if (refreshToken) {
      if (isRefreshing) {
        try {
          const newToken = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          const retryHeaders = await getHeaders(newToken);
          const retryRes = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
            ...restOptions,
            headers: retryHeaders,
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

        const retryHeaders = await getHeaders(newAccessToken);
        const retryRes = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
          ...restOptions,
          headers: retryHeaders,
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
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText || 'Failed to parse JSON' };
    }
  } else {
    const text = await response.text();
    if (text.includes('Service Suspended') || text.includes('<!DOCTYPE html>')) {
      data = { message: 'Cloud backend service is unreachable or suspended. Local/offline fallback active.' };
    } else {
      data = { message: text || response.statusText };
    }
  }

  if (!response.ok || (typeof data?.message === 'string' && data.message.includes('Cloud backend service is unreachable'))) {
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
