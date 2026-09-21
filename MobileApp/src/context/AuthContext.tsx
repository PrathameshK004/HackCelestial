/**
 * Auth Context — Real backend authentication with OTP 2-step signup
 *
 * Signup flow:
 *   registerTemp()       → POST /users/registerTempUser (pending user + OTP email)
 *   verifyAndRegister()  → POST /users/registerUser (OTP validate + activate + JWT)
 *
 * Login:
 *   login()              → POST /users/login (email + password → JWT)
 *
 * Session persistence:
 *   Tokens are stored in device storage. On app start, restoreSession()
 *   loads saved tokens and silently refreshes the user profile.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  LoginPayload,
  RegisterUserPayload,
  RegisterTempPayload,
  VerifyRegisterPayload,
} from '../types';
import { authService } from '../api/auth.service';
import { storage } from '../database/storage';
import { syncService } from '../sync/syncService';
import { notificationService } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Standard login with email + password */
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;

  /**
   * Step 1 of signup: Create pending user + send OTP email.
   * Returns { success, otp? } — otp is echoed from backend for dev visibility.
   */
  registerTemp: (payload: RegisterTempPayload) => Promise<{ success: boolean; otp?: string; message?: string }>;

  /**
   * Step 2 of signup: Submit OTP → activate account → instant login.
   * Returns { success, message? }
   */
  verifyAndRegister: (payload: VerifyRegisterPayload) => Promise<{ success: boolean; message?: string }>;

  /**
   * Resend OTP to temp user email (30s cooldown enforced by UI)
   */
  resendOtp: (emailId: string, purpose?: string) => Promise<{ success: boolean; otp?: string; message?: string }>;

  /** Legacy register for backward compat */
  register: (payload: RegisterUserPayload) => Promise<{ success: boolean; error?: string }>;

  /** Google SSO sign-in */
  loginWithGoogle: (credentialOrPayload: string | { credential?: string; accessToken?: string }) => Promise<{ success: boolean; error?: string }>;

  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Session Restore ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await storage.getAuthToken();
        const savedUser = await storage.getAuthUser();

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);

          // Silently verify + refresh profile in background
          authService.getProfile()
            .then((res) => {
              const freshUser = (res.data as any)?.user || res.data;
              if (freshUser && freshUser.id) {
                const merged: User = { ...savedUser, ...freshUser };
                setUser(merged);
                storage.setAuthUser(merged);
              }
            })
            .catch(() => {
              // Token may be expired — silent fail, keep local session alive
            });

          syncService.downloadServerData();
          // Register device for push notifications in background
          notificationService.registerForPushNotifications().catch(() => {});
        }
        // If no saved session → user sees AuthScreen (no fake seed)
      } catch (e) {
        console.warn('[AuthContext] Session restore error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ── Helper: persist session after successful auth ────────────────────────────
  const persistSession = async (data: any, fallbackName?: string, fallbackEmail?: string) => {
    const accessToken: string = data.accessToken;
    const refreshToken: string | undefined = data.refreshToken;

    setToken(accessToken);
    await storage.setAuthToken(accessToken);
    if (refreshToken) {
      await storage.setRefreshToken(refreshToken);
    }

    const resolvedUser: User = data.user || {
      id: data.userId || data.id || data.userKey || 'unknown',
      name: data.username || fallbackName,
      username: data.username || fallbackName,
      emailId: data.emailId || fallbackEmail,
      email: data.emailId || fallbackEmail,
      phone: data.phone || null,
      upiId: data.upiId || null,
      avatarBg: '#059669',
    };

    setUser(resolvedUser);
    await storage.setAuthUser(resolvedUser);

    // Register push notification token on login
    notificationService.registerForPushNotifications().catch(() => {});
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (payload: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.login(payload);
      if (res.data?.accessToken) {
        await persistSession(res.data, payload.emailId.split('@')[0], payload.emailId);
        syncService.downloadServerData();
        return { success: true };
      }
      return { success: false, error: res.message || 'Login failed. Please check your credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to server.' };
    }
  };

  // ── Step 1: Register Temp User + Trigger OTP ─────────────────────────────────
  const registerTemp = async (
    payload: RegisterTempPayload
  ): Promise<{ success: boolean; otp?: string; message?: string }> => {
    try {
      const res = await authService.registerTemp(payload);
      // Backend responds with { message, data: { emailId, otp, expiresIn } }
      const otp = res.data?.otp != null ? String(res.data.otp) : undefined;
      return { success: true, otp, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed. Please try again.' };
    }
  };

  // ── Step 2: Verify OTP + Activate Account + Instant Login ───────────────────
  const verifyAndRegister = async (
    payload: VerifyRegisterPayload
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await authService.verifyAndRegister(payload);
      if (res.data?.accessToken) {
        await persistSession(res.data, payload.username, payload.emailId);
        syncService.downloadServerData();
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'Verification failed. Please check the code.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'OTP verification error. Please try again.' };
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const resendOtp = async (
    emailId: string,
    purpose: string = 'Sign Up'
  ): Promise<{ success: boolean; otp?: string; message?: string }> => {
    try {
      const res = await authService.sendOtp({ emailId, purpose });
      const otp = res.data?.otp != null ? String(res.data.otp) : undefined;
      return { success: true, otp, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'Could not resend code. Please try again.' };
    }
  };

  // ── Legacy Register (backward compat) ────────────────────────────────────────
  const register = async (
    payload: RegisterUserPayload
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.register(payload);
      if (res.data?.accessToken) {
        await persistSession(res.data, payload.username, payload.emailId);
        return { success: true };
      }
      return { success: false, error: res.message || 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to register.' };
    }
  };

  // ── Google Login ─────────────────────────────────────────────────────────────
  const loginWithGoogle = async (
    credentialOrPayload: string | { credential?: string; accessToken?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.loginWithGoogle(credentialOrPayload);
      if (res.data?.accessToken) {
        await persistSession(res.data, (res.data as any).username || res.data.user?.username, res.data.emailId || res.data.user?.emailId);
        syncService.downloadServerData();
        return { success: true };
      }
      return { success: false, error: res.message || 'Google sign-in failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Google sign-in failed.' };
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    try {
      await notificationService.unregisterPushNotifications().catch(() => {});
      await authService.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      await storage.clearSession();
    }
  };

  // ── Update User ──────────────────────────────────────────────────────────────
  const updateUser = (data: Partial<User>): void => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    storage.setAuthUser(updated);
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
        registerTemp,
        verifyAndRegister,
        resendOtp,
        register,
        loginWithGoogle,
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
