import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API URL from env, fallback to localhost for dev
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'user';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Extract a human-readable message from an API error.
 * The backend error envelope is { success: false, error, code } — see
 * GlobalExceptionFilter — so `error` is the message field.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  const data = (err as AxiosError<{ error?: string; message?: string }>)?.response?.data;
  return data?.error || data?.message || fallback;
}

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Single in-flight refresh shared by every request that hits an expired token.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a new token pair (rotation).
 * Resolves to the new access token, or null when the session cannot be renewed.
 * Also used by the socket layer before reconnecting with an expired token.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
      // Plain axios — bypass this instance's interceptors to avoid recursion
      const res = await axios.post(`${API_URL}/auth/refresh`, null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      const { accessToken, refreshToken: nextRefresh, user } = res.data.data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, nextRefresh);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { accessToken, user } }));
      return accessToken as string;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Response interceptor — on an expired access token, refresh once and retry.
// IMPORTANT: Do NOT use window.location.href here — that causes a hard reload
// which unmounts all sockets and resets React state. Instead, dispatch a custom
// event so AuthContext can clear the session and useRequireAuth redirects via
// the Next.js router (soft navigation).
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string }>) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => original?.url?.includes(p));

    // Only react when the backend explicitly says the token is bad.
    if (status !== 401 || code === undefined || isAuthEndpoint || typeof window === 'undefined') {
      return Promise.reject(error);
    }

    if (original && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    return Promise.reject(error);
  }
);
