import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, 
  LoginPayload, 
  RegisterTempPayload, 
  RegisterUserPayload, 
  PasswordChangePayload,
  ResetPasswordPayload 
} from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (data: { username: string; emailId: string; password: string }) => Promise<{ success: boolean; message?: string; user?: User }>;
  registerTemp: (data: RegisterTempPayload) => Promise<{ success: boolean; message?: string; otp?: string | number; data?: any }>;
  verifyAndRegister: (data: RegisterUserPayload) => Promise<{ success: boolean; message?: string; user?: User }>;
  resendOtp: (emailId: string, purpose?: string) => Promise<{ success: boolean; message?: string; otp?: string | number }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message?: string; user?: User }>;
  changePassword: (data: PasswordChangePayload) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (emailId: string) => Promise<{ success: boolean; message?: string }>;
  verifyResetOtp: (emailId: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (data: ResetPasswordPayload) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { USER_STORAGE_KEY, TOKEN_STORAGE_KEY, REFRESH_TOKEN_KEY } from '../services/apiClient';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize auth state from localStorage on startup
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to parse cached auth state:', err);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to session expiry events dispatched by apiClient
    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const saveAuthSession = (newUser: User, newAccessToken?: string, newRefreshToken?: string) => {
    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));

    if (newAccessToken) {
      setToken(newAccessToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
    }
    if (newRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    }
  };

  const clearAuthSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  /**
   * Log into platform
   */
  const login = async (credentials: LoginPayload) => {
    try {
      const response = await authService.login(credentials);
      if (response.data) {
        const loggedUser: User = {
          userId: response.data.userId,
          id: response.data.userId,
          username: response.data.username,
          emailId: response.data.emailId || credentials.emailId,
          phone: (response.data as any).phone || null,
          upiId: (response.data as any).upiId || null,
          avatar: (response.data as any).avatar || null,
          travelStyle: (response.data as any).travelStyle || 'Boutique',
          currency: (response.data as any).currency || 'INR'
        };

        saveAuthSession(loggedUser, response.data.accessToken, response.data.refreshToken);
        return { 
          success: true, 
          message: response.message || 'Logged in successfully',
          user: loggedUser 
        };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid email or password' };
    }
  };

  /**
   * Direct 1-Step Registration with Instant Authentication (Industry Standard)
   */
  const register = async (data: { username: string; emailId: string; password: string }) => {
    try {
      const response = await authService.register(data);
      if (response.data) {
        const rawData = response.data as any;
        const newUser: User = {
          userId: rawData.userId || rawData.id,
          id: rawData.userId || rawData.id,
          username: rawData.username,
          emailId: rawData.emailId || data.emailId,
          phone: rawData.phone || null,
          upiId: rawData.upiId || null,
          avatar: rawData.avatar || null,
          travelStyle: rawData.travelStyle || 'Boutique',
          currency: rawData.currency || 'INR'
        };

        saveAuthSession(newUser, rawData.accessToken, rawData.refreshToken);
        return {
          success: true,
          message: response.message || 'Account created successfully!',
          user: newUser
        };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed. Please try again.' };
    }
  };

  /**
   * Initiate registration (create temp user and send OTP)
   */
  const registerTemp = async (data: RegisterTempPayload) => {
    try {
      const response = await authService.registerTempUser(data);
      const rawData = response.data as any;
      return { 
        success: true, 
        message: response.message || 'Verification code sent to your email',
        otp: rawData?.otp,
        data: rawData
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to start registration' };
    }
  };

  /**
   * Verify OTP and complete registration, then auto-login in 1 seamless step
   */
  const verifyAndRegister = async (data: RegisterUserPayload) => {
    try {
      const response = await authService.verifyAndRegisterUser(data);
      if (response.data) {
        const rawData = response.data as any;
        const newUser: User = {
          userId: rawData.userId || rawData.id,
          id: rawData.userId || rawData.id,
          username: rawData.username,
          emailId: rawData.emailId || data.emailId,
          phone: rawData.phone || null,
          upiId: rawData.upiId || null,
          avatar: rawData.avatar || null,
          travelStyle: rawData.travelStyle || 'Boutique',
          currency: rawData.currency || 'INR'
        };

        // If accessToken was directly returned by verifyAndRegister, log in immediately!
        if (rawData.accessToken) {
          saveAuthSession(newUser, rawData.accessToken, rawData.refreshToken);
        } else {
          // Fallback login
          try {
            const loginRes = await authService.login({
              emailId: data.emailId,
              password: data.password,
            });
            if (loginRes.data) {
              saveAuthSession(newUser, loginRes.data.accessToken, loginRes.data.refreshToken);
            } else {
              saveAuthSession(newUser);
            }
          } catch {
            saveAuthSession(newUser);
          }
        }

        return { 
          success: true, 
          message: response.message || 'Account created and verified successfully!',
          user: newUser
        };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid verification code or registration failed' };
    }
  };

  /**
   * Resend OTP
   */
  const resendOtp = async (emailId: string, purpose: string = 'Sign Up') => {
    try {
      const response = await authService.sendOtp({ emailId, purpose });
      const rawData = response.data as any;
      return { 
        success: true, 
        message: response.message || 'New OTP sent to your email',
        otp: rawData?.otp
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to resend OTP' };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await authService.loginWithGoogle(credential);
      if (!response.data) return { success: false, message: response.message || 'Google login failed' };
      const loggedUser: User = {
        userId: response.data.userId,
        id: response.data.userId,
        username: response.data.username,
        emailId: response.data.emailId || '',
        phone: (response.data as any).phone || undefined,
        upiId: (response.data as any).upiId || undefined,
        avatar: (response.data as any).avatar || undefined,
        travelStyle: (response.data as any).travelStyle || 'Boutique',
        currency: (response.data as any).currency || 'INR',
      };
      saveAuthSession(loggedUser, response.data.accessToken, response.data.refreshToken);
      return { success: true, message: response.message, user: loggedUser };
    } catch (err: any) {
      return { success: false, message: err.message || 'Google login failed' };
    }
  };

  /**
   * Real-time profile update: updates backend, saves locally, and broadcasts to all listeners
   */
  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('You must be signed in to update your profile.');
    
    try {
      const response = await authService.updateProfile(data);
      const updatedUser: User = {
        ...user,
        ...data,
        ...((response.data as any) || {})
      };

      saveAuthSession(updatedUser);

      // Trigger local and cross-tab reactive updates immediately
      window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: updatedUser }));
      try {
        const bc = new BroadcastChannel('triptual_auth_channel');
        bc.postMessage({ type: 'USER_UPDATED', user: updatedUser });
        bc.close();
      } catch {}

      return {
        success: true,
        message: response.message || 'Profile updated successfully!',
        user: updatedUser
      };
    } catch (err: any) {
      console.warn('Profile update API note:', err.message);
      // Resilient optimistic update
      const updatedUser: User = { ...user, ...data };
      saveAuthSession(updatedUser);
      window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: updatedUser }));
      return {
        success: true,
        message: 'Profile saved locally.',
        user: updatedUser
      };
    }
  };

  /**
   * Change password while authenticated
   */
  const changePassword = async (data: PasswordChangePayload) => {
    try {
      const response = await authService.changePassword(data);
      return { 
        success: true, 
        message: response.message || 'Password changed successfully' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Failed to update password. Please check your current password.' 
      };
    }
  };

  /**
   * Request password reset OTP
   */
  const forgotPassword = async (emailId: string) => {
    try {
      const response = await authService.forgotPassword({ emailId });
      return { 
        success: true, 
        message: response.message || 'Verification code sent to your email' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Failed to send password reset code' 
      };
    }
  };

  /**
   * Verify password reset OTP
   */
  const verifyResetOtp = async (emailId: string, code: string) => {
    try {
      const response = await authService.verifyResetOtp({ emailId, code });
      return { 
        success: true, 
        message: response.message || 'Code verified successfully' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Invalid verification code' 
      };
    }
  };

  /**
   * Complete password reset
   */
  const resetPassword = async (data: ResetPasswordPayload) => {
    try {
      const response = await authService.resetPassword(data);
      return { 
        success: true, 
        message: response.message || 'Password reset successfully! Please sign in.' 
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.message || 'Failed to reset password' 
      };
    }
  };

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuthSession();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        registerTemp,
        verifyAndRegister,
        resendOtp,
        loginWithGoogle,
        updateProfile,
        changePassword,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        logout,
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
