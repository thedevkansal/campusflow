'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from '@/lib/api';

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
}

interface AuthContextType {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN' | null;
  login: (token: string, user: StoredUser, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for session events dispatched by the Axios layer.
  // auth:unauthorized → refresh failed; clear state so useRequireAuth redirects
  // via Next.js router — no hard page reload, no socket reconnect churn.
  // auth:token-refreshed → keep React state in sync with the rotated tokens.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearStoredSession();
      setToken(null);
      setUser(null);
    };
    const handleRefreshed = (e: Event) => {
      const { accessToken, user: refreshedUser } = (e as CustomEvent<{
        accessToken: string;
        user: StoredUser;
      }>).detail;
      setToken(accessToken);
      setUser(refreshedUser);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:token-refreshed', handleRefreshed);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:token-refreshed', handleRefreshed);
    };
  }, []);

  const login = (newToken: string, newUser: StoredUser, refreshToken?: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    // Best-effort server-side revocation (blacklists the access token and
    // revokes the refresh token); local state is cleared regardless.
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
    if (localStorage.getItem(TOKEN_KEY)) {
      api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clearStoredSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        role: user?.role ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
