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
import { notificationService } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Standard login with email + password (supports 2FA challenge) */
  login: (payload: LoginPayload) => Promise<{ success: boolean; twoFactorRequired?: boolean; emailId?: string; error?: string }>;

  /** Verify 6-digit 2FA OTP code on login challenge */
  verifyTwoFactorLogin: (payload: { emailId: string; code: string }) => Promise<{ success: boolean; error?: string }>;

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
  updateUser: (data: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  refreshProfile: () => Promise<User | null>;
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
              if (freshUser && (freshUser.id || freshUser.userId)) {
                const merged: User = { 
                  ...savedUser, 
                  ...freshUser,
                  id: freshUser.id || freshUser.userId,
                  name: freshUser.name || freshUser.username,
                  username: freshUser.username || freshUser.name,
                  email: freshUser.email || freshUser.emailId,
                  emailId: freshUser.emailId || freshUser.email,
                  phone: freshUser.phone !== undefined ? freshUser.phone : savedUser.phone,
                  upiId: freshUser.upiId !== undefined ? freshUser.upiId : savedUser.upiId,
                  avatar: freshUser.avatar !== undefined ? freshUser.avatar : savedUser.avatar,
                  travelStyle: freshUser.travelStyle || savedUser.travelStyle,
                  currency: freshUser.currency || savedUser.currency,
                  dob: freshUser.dob !== undefined ? freshUser.dob : (savedUser.dob || null),
                  twoFactorEnabled: freshUser.twoFactorEnabled !== undefined ? Boolean(freshUser.twoFactorEnabled) : Boolean(savedUser.twoFactorEnabled),
                };
                setUser(merged);
                storage.setAuthUser(merged);
              }
            })
            .catch(() => {
              // Token may be expired — silent fail, keep local session alive
            });

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
      avatar: data.avatar || data.user?.avatar || null,
      travelStyle: data.travelStyle || 'Boutique',
      currency: data.currency || 'INR',
      dob: data.dob || null,
      twoFactorEnabled: data.twoFactorEnabled !== undefined ? Boolean(data.twoFactorEnabled) : Boolean(data.user?.twoFactorEnabled),
      avatarBg: '#059669',
    };

    setUser(resolvedUser);
    await storage.setAuthUser(resolvedUser);

    // Register push notification token on login
    notificationService.registerForPushNotifications().catch(() => {});
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = async (
    payload: LoginPayload
  ): Promise<{ success: boolean; twoFactorRequired?: boolean; emailId?: string; error?: string }> => {
    try {
      const res = await authService.login(payload);
      if (res.data?.twoFactorRequired) {
        return {
          success: false,
          twoFactorRequired: true,
          emailId: res.data.emailId || payload.emailId,
        };
      }
      if (res.data?.accessToken) {
        await persistSession(res.data, payload.emailId.split('@')[0], payload.emailId);
        return { success: true };
      }
      return { success: false, error: res.message || 'Login failed. Please check your credentials.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to server.' };
    }
  };

  // ── Verify 2FA OTP Code on Login ─────────────────────────────────────────────
  const verifyTwoFactorLogin = async (payload: {
    emailId: string;
    code: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authService.verifyTwoFactorLogin(payload);
      if (res.data?.accessToken) {
        await persistSession(res.data, payload.emailId.split('@')[0], payload.emailId);
        return { success: true };
      }
      return { success: false, error: res.message || 'Invalid 2FA verification code.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification error. Please try again.' };
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

  // ── Refresh Profile directly from PostgreSQL DB ───────────────────────────
  const refreshProfile = async (): Promise<User | null> => {
    try {
      const res = await authService.getProfile();
      const freshUser = (res.data as any)?.user || res.data;
      if (freshUser && (freshUser.id || freshUser.userId)) {
        const merged: User = {
          ...user,
          ...freshUser,
          id: freshUser.id || freshUser.userId,
          name: freshUser.name || freshUser.username,
          username: freshUser.username || freshUser.name,
          email: freshUser.email || freshUser.emailId,
          emailId: freshUser.emailId || freshUser.email,
          phone: freshUser.phone !== undefined ? freshUser.phone : user?.phone,
          upiId: freshUser.upiId !== undefined ? freshUser.upiId : user?.upiId,
          avatar: freshUser.avatar !== undefined ? freshUser.avatar : user?.avatar,
          travelStyle: freshUser.travelStyle || user?.travelStyle,
          currency: freshUser.currency || user?.currency,
          dob: freshUser.dob !== undefined ? freshUser.dob : (user?.dob || null),
          twoFactorEnabled: freshUser.twoFactorEnabled !== undefined ? Boolean(freshUser.twoFactorEnabled) : Boolean(user?.twoFactorEnabled),
        };
        setUser(merged);
        await storage.setAuthUser(merged);
        return merged;
      }
      return user;
    } catch (e) {
      console.warn('[AuthContext] refreshProfile error:', e);
      return user;
    }
  };

  // ── Update User (Single source of truth via PostgreSQL) ──────────────────────
  const updateUser = async (data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const res = await authService.updateProfile(data);
      const serverUser = (res.data as any)?.user || res.data;
      if (serverUser && (serverUser.id || serverUser.userId)) {
        const merged: User = {
          ...user,
          ...data,
          ...serverUser,
          id: serverUser.id || serverUser.userId || user.id,
          name: serverUser.name || serverUser.username || data.name || user.name,
          username: serverUser.username || serverUser.name || data.username || user.username,
          email: serverUser.email || serverUser.emailId || user.email,
          emailId: serverUser.emailId || serverUser.email || user.emailId,
          phone: serverUser.phone !== undefined ? serverUser.phone : (data.phone !== undefined ? data.phone : user.phone),
          upiId: serverUser.upiId !== undefined ? serverUser.upiId : (data.upiId !== undefined ? data.upiId : user.upiId),
          avatar: serverUser.avatar !== undefined ? serverUser.avatar : (data.avatar !== undefined ? data.avatar : user.avatar),
          travelStyle: serverUser.travelStyle || data.travelStyle || user.travelStyle,
          currency: serverUser.currency || data.currency || user.currency,
          dob: serverUser.dob !== undefined ? serverUser.dob : (data.dob !== undefined ? data.dob : user.dob),
          twoFactorEnabled: data.twoFactorEnabled !== undefined ? Boolean(data.twoFactorEnabled) : (serverUser.twoFactorEnabled !== undefined ? Boolean(serverUser.twoFactorEnabled) : user.twoFactorEnabled),
        };
        setUser(merged);
        await storage.setAuthUser(merged);
        return { success: true, user: merged };
      }
      return { success: false, error: 'Server did not return valid user data' };
    } catch (err: any) {
      console.error('[AuthContext] updateUser server error:', err.message);
      return { success: false, error: err.message || 'Failed to update profile on server' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isLoading,
        login,
        verifyTwoFactorLogin,
        registerTemp,
        verifyAndRegister,
        resendOtp,
        register,
        loginWithGoogle,
        logout,
        updateUser,
        refreshProfile,
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
