/**
 * Auth Context with Offline Session Persistence
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginPayload, RegisterUserPayload } from '../types';
import { authService } from '../api/auth.service';
import { storage } from '../database/storage';
import { syncService } from '../sync/syncService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterUserPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await storage.getAuthToken();
        const savedUser = await storage.getAuthUser();

        if (savedToken) {
          setToken(savedToken);
          if (savedUser) {
            setUser(savedUser);
          } else {
            // Default user fallback for offline operation
            setUser({
              id: 'user-1',
              name: 'Yogesh Dandawalkar',
              emailId: 'yogeshdand04@gmail.com',
              avatarBg: '#464B29',
              upiId: 'yogesh@okaxis'
            });
          }

          // Background verification and sync when online
          authService.getProfile()
            .then((res) => {
              if (res.data) {
                const refreshed = (res.data as any).user || res.data;
                setUser(refreshed);
                storage.setAuthUser(refreshed);
              }
            })
            .catch(() => {
              // Silent catch: offline mode persists session
            });

          // Trigger data sync
          syncService.downloadServerData();
        } else {
          // Pre-seed default offline active session for immediate usability
          const defaultUser: User = {
            id: 'user-1',
            name: 'Yogesh Dandawalkar',
            emailId: 'yogesh@example.com',
            avatarBg: '#059669',
            upiId: 'yogesh@okaxis'
          };
          setUser(defaultUser);
          setToken('demo-offline-jwt-token');
          await storage.setAuthUser(defaultUser);
          await storage.setAuthToken('demo-offline-jwt-token');
        }
      } catch (e) {
        console.warn('Session restore error:', e);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.login(payload);
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        await storage.setAuthToken(res.data.accessToken);
        if (res.data.refreshToken) {
          await storage.setRefreshToken(res.data.refreshToken);
        }
        const loggedInUser: User = res.data.user || {
          id: res.data.userKey || 'user-1',
          name: payload.emailId.split('@')[0],
          emailId: payload.emailId,
          avatarBg: '#059669',
        };
        setUser(loggedInUser);
        await storage.setAuthUser(loggedInUser);

        // Download server data
        syncService.downloadServerData();

        return { success: true };
      }
      return { success: false, error: res.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to server' };
    }
  };

  const register = async (payload: RegisterUserPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.register(payload);
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        await storage.setAuthToken(res.data.accessToken);
        const registeredUser: User = res.data.user || {
          id: res.data.userKey || 'user-1',
          name: payload.username,
          emailId: payload.emailId,
          avatarBg: '#059669',
        };
        setUser(registeredUser);
        await storage.setAuthUser(registeredUser);
        return { success: true };
      }
      return { success: false, error: res.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to register' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      await storage.clearSession();
    }
  };

  const updateUser = async (data: Partial<User>): Promise<void> => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    await storage.setAuthUser(updated);
    authService.updateProfile(data).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
