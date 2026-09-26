/**
 * API client for the live backend.
 * Features: Silent Token Rotation, Request Replay, Network Timeout Handling
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { storage } from "../database/storage";

declare const process: any;
declare const __DEV__: boolean;

const LOCAL_EMULATOR_API_BASE = "http://10.0.2.2:4000/api";
const LIVE_API_BASE = "https://hackcelestial-api.onrender.com/api";

const getPackagerHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    return new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`).hostname;
  } catch {
    return null;
  }
};

const isLocalApiUrl = (value: string): boolean => {
  try {
    const hostname = new URL(value).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    return hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "10.0.2.2" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {
    return false;
  }
};

const getDefaultApiBase = (): string => {
  if (Platform.OS === "android") {
    return LOCAL_EMULATOR_API_BASE;
  }

  if (Platform.OS === "ios") {
    return "http://localhost:4000/api";
  }

  return LIVE_API_BASE;
};

const normalizeLocalDevUrl = (url: string): string => {
  let normalized = url.trim().replace(/\/+$/, "");

  if (Platform.OS === "android") {
    if (/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/i.test(normalized)) {
      normalized = normalized.replace(/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?/i, "http://10.0.2.2");
    }
  }

  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/i.test(normalized)) {
    if (/(8081|8082|3000|5173|4173)$/i.test(normalized) && !normalized.endsWith("/api")) {
      normalized = normalized.replace(/:\d+$/, ":4000");
    }
  }

  if (!normalized.endsWith("/api")) {
    normalized = `${normalized}/api`;
  }

  return normalized;
};

export const getApiBase = (): string => {
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    const normalizedUrl = normalizeLocalDevUrl(envUrl);
    if (isLocalApiUrl(normalizedUrl)) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        return `http://${window.location.hostname}:4000/api`;
      }
      if (Platform.OS !== "web" && Device.isDevice) {
        const packagerHost = getPackagerHost();
        if (packagerHost) return `http://${packagerHost}:4000/api`;
      }
    }
    return normalizedUrl;
  }

  if (typeof __DEV__ !== "undefined" && !__DEV__) return LIVE_API_BASE;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:4000/api`;
  }
  if (Platform.OS !== "web" && Device.isDevice) {
    const packagerHost = getPackagerHost();
    if (packagerHost) return `http://${packagerHost}:4000/api`;
  }

  return getDefaultApiBase();
};

export const API_BASE = getApiBase();

export const SERVER_BASE = API_BASE.replace(/\/api\/?$/, "");

export const getProfilePictureUri = (avatar: string): string => {
  const normalized = String(avatar || "").trim();
  if (!normalized) return "";

  if (normalized.startsWith("data:image/")) return normalized;

  const hasProfilePicturesKey = normalized.includes("profile-pictures/");
  if (hasProfilePicturesKey) {
    try {
      const url = new URL(normalized);
      const key = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (key.startsWith("profile-pictures/")) {
        return `${API_BASE}/users/profile/picture?key=${encodeURIComponent(key)}`;
      }
    } catch {
      const key =
        normalized.split("profile-pictures/")[1] ||
        normalized.replace(/^\/+/, "");
      return `${API_BASE}/users/profile/picture?key=${encodeURIComponent(`profile-pictures/${key}`)}`;
    }
  }

  if (
    normalized.startsWith("profile-pictures/") ||
    normalized.startsWith("/profile-pictures/")
  ) {
    const key = normalized.replace(/^\/+/, "");
    return `${API_BASE}/users/profile/picture?key=${encodeURIComponent(key)}`;
  }

  if (
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("/illustrations/") ||
    normalized.startsWith("/")
  ) {
    return `${SERVER_BASE}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
  }

  return normalized;
};

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
    throw new Error("No refresh token available");
  }

  const response = await fetchWithTimeout(`${API_BASE}/users/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
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
    const errorMsg =
      data?.err?.message || data?.message || "Failed to refresh token";
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
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { timeoutMs = 25000, ...fetchOptions } = options;
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
    if (err.name === "AbortError") {
      const timeoutError = new Error(
        `Network request timed out after ${timeoutMs}ms. The backend may be starting up or the connection is slow.`,
      );
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
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    token,
    headers = {},
    skipAuthRefresh = false,
    ...restOptions
  } = options;

  const getHeaders = async (
    authToken?: string | null,
  ): Promise<Record<string, string>> => {
    const activeToken =
      authToken !== undefined
        ? authToken
        : token || (await storage.getAuthToken());
    const h: Record<string, string> = {
      Accept: "application/json",
      ...(headers as Record<string, string>),
    };
    if (!(restOptions.body instanceof FormData) && !h["Content-Type"]) {
      h["Content-Type"] = "application/json";
    }
    if (activeToken) {
      h["Authorization"] = `Bearer ${activeToken}`;
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
    const error = new Error(
      netErr.message ||
        "Cannot connect to backend server. Running in offline mode.",
    );
    (error as any).status = 503;
    (error as any).isOffline = true;
    throw error;
  }

  // Handle Token Expiry (401 / 403) with Silent Refresh & Replay
  if (
    (response.status === 401 || response.status === 403) &&
    !skipAuthRefresh &&
    !endpoint.includes("/users/login") &&
    !endpoint.includes("/users/refresh")
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
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText || "Failed to parse JSON" };
    }
  } else {
    const text = await response.text();
    if (
      text.includes("Service Suspended") ||
      text.includes("<!DOCTYPE html>")
    ) {
      data = {
        message:
          "Cloud backend service is unreachable or suspended. Local/offline fallback active.",
      };
    } else {
      data = { message: text || response.statusText };
    }
  }

  if (
    !response.ok ||
    (typeof data?.message === "string" &&
      data.message.includes("Cloud backend service is unreachable"))
  ) {
    const errorMessage =
      data?.err?.message ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join(", ") : null) ||
      (Array.isArray(data?.data?.errors)
        ? data.data.errors.join(", ")
        : null) ||
      (typeof data?.err === "string" ? data.err : null) ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
