import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginPayload, RegisterTempPayload, RegisterUserPayload } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<{ success: boolean; message?: string; user?: User }>;
  registerTemp: (data: RegisterTempPayload) => Promise<{ success: boolean; message?: string }>;
  verifyAndRegister: (data: RegisterUserPayload) => Promise<{ success: boolean; message?: string; user?: User }>;
  resendOtp: (emailId: string, purpose?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  updateProfile: (data: { username?: string; upiId?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'triptual_auth_user';
const TOKEN_STORAGE_KEY = 'triptual_auth_token';
const REFRESH_TOKEN_KEY = 'triptual_refresh_token';
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://hackcelestial-api.onrender.com/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on initial boot
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (savedToken && savedUser) {
        try {
          // Attempt verifying with backend checkAuth
          const res = await authService.checkAuth(savedToken);
          if (res.data?.isAuthenticated) {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
          } else {
            // Keep user logged in if local token exists but checkAuth wasn't able to reach
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
          }
        } catch (err) {
          // If 401 or invalid token, keep saved local state if desirable or clean up
          console.warn('Session check note:', err);
          if ((err as any)?.status === 401) {
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            setUser(null);
            setToken(null);
          } else {
            // Network issue or offline - preserve cached state
            try {
              setUser(JSON.parse(savedUser));
              setToken(savedToken);
            } catch {
              setUser(null);
            }
          }
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const saveAuthSession = (userData: User, accessToken?: string, refreshToken?: string) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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
   * Handle user login
   */
  const login = async (credentials: LoginPayload) => {
    try {
      const response = await authService.login(credentials);
      if (response.data) {
        const loggedUser: User = {
          userId: response.data.userId,
          username: response.data.username,
          emailId: credentials.emailId,
        };

        saveAuthSession(loggedUser, response.data.accessToken, response.data.refreshToken);
        return { success: true, message: response.message || 'Login successful', user: loggedUser };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid email or password' };
    }
  };

  /**
   * Initiate registration (create temp user and send OTP)
   */
  const registerTemp = async (data: RegisterTempPayload) => {
    try {
      const response = await authService.registerTempUser(data);
      return { success: true, message: response.message || 'Verification code sent to your email' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to start registration' };
    }
  };

  /**
   * Verify OTP and complete registration, then auto-login
   */
  const verifyAndRegister = async (data: RegisterUserPayload) => {
    try {
      const response = await authService.verifyAndRegisterUser(data);
      if (response.data) {
        const newUser: User = {
          userId: response.data.userId,
          username: response.data.username,
          emailId: response.data.emailId || data.emailId,
        };

        // Automatically log in the user after successful signup verification
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
          // If immediate auto-login call encounters an issue, still preserve user state
          saveAuthSession(newUser);
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
      return { success: true, message: response.message || 'New OTP sent to your email' };
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
        username: response.data.username,
        emailId: response.data.emailId || '',
      };
      saveAuthSession(loggedUser, response.data.accessToken, response.data.refreshToken);
      return { success: true, message: response.message, user: loggedUser };
    } catch (err: any) {
      return { success: false, message: err.message || 'Google login failed' };
    }
  };

  const updateProfile = async (data: { username?: string; upiId?: string }) => {
    if (!user || !token) throw new Error('You must be signed in to update your profile.');
    const response = await fetch(`${API_BASE}/users/${user.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Unable to update profile.');
    saveAuthSession({ ...user, ...data });
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
        registerTemp,
        verifyAndRegister,
        resendOtp,
        loginWithGoogle,
        updateProfile,
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
