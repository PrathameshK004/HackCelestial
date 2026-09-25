/**
 * Authentication Service
 * Wired to live backend API contracts (industry-grade OTP signup flow)
 *
 * Signup flow (2-step):
 *   1. registerTemp() → POST /users/registerTempUser  — creates pending user, sends OTP email
 *   2. verifyAndRegister() → POST /users/registerUser — validates OTP, activates account, returns JWT
 *
 * Login:
 *   login() → POST /users/login — email + password → JWT + refresh token
 */

import { apiRequest } from './apiClient';
import { AuthResponse, LoginPayload, RegisterTempPayload, VerifyRegisterPayload, RegisterUserPayload, User } from '../types';

export const authService = {
  /**
   * Step 1 of signup: Create a temporary (pending) account and trigger OTP email
   */
  async registerTemp(payload: RegisterTempPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerTempUser', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Step 2 of signup: Submit OTP code to verify email and fully activate account.
   * On success backend returns accessToken + refreshToken (instant login).
   */
  async verifyAndRegister(payload: VerifyRegisterPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerUser', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
        code: payload.code.trim(),
      }),
    });
  },

  /**
   * Login with email + password
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Resend OTP to an existing temp user (e.g. after 30s timer)
   */
  async sendOtp(payload: { emailId: string; purpose?: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/sendOtp', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        purpose: payload.purpose || 'Sign Up',
      }),
    });
  },

  /**
   * Legacy register — kept for backward compat (same as verifyAndRegister)
   */
  async register(payload: RegisterUserPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerUser', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
        code: payload.code?.trim(),
      }),
    });
  },

  async checkAuth(token: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/checkAuth', {
      method: 'GET',
      token,
    });
  },

  async logout(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/logout', {
      method: 'GET',
    });
  },

  async getProfile(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/profile', {
      method: 'GET',
    });
  },

  async updateProfile(payload: Partial<User>): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(emailId: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ emailId: emailId.trim().toLowerCase() }),
    });
  },

  async verifyResetOtp(payload: { emailId: string; code: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        code: payload.code.trim(),
      }),
    });
  },

  async resetPassword(payload: { emailId: string; code: string; newPassword: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async toggleTwoFactor(enable?: boolean): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/2fa/toggle', {
      method: 'POST',
      body: JSON.stringify({ enable }),
    });
  },

  async verifyTwoFactorOtp(code: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async verifyTwoFactorLogin(payload: { emailId: string; code: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async revokeAllSessions(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/revoke-sessions', {
      method: 'POST',
    });
  },

  /**
   * Upload profile picture directly to AWS S3 via backend
   */
  async uploadProfilePicture(file: { uri: string; name?: string; type?: string }): Promise<AuthResponse> {
    const fileName = file.name || `photo_${Date.now()}.jpg`;
    const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypeFromName: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    const resolvedMime = (file.type && file.type.startsWith('image/')) ? file.type : (mimeTypeFromName[extension] || 'image/jpeg');

    const formData = new FormData();
    const fileResponse = await fetch(file.uri);
    const fileBlob = await fileResponse.blob();
    const safeBlob = fileBlob && fileBlob.size > 0
      ? fileBlob.slice(0, fileBlob.size, resolvedMime)
      : new Blob([await fileResponse.arrayBuffer()], { type: resolvedMime });

    formData.append('picture', safeBlob, fileName);

    return apiRequest<AuthResponse>('/users/profile/picture', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Remove current profile picture from S3 and reset avatar
   */
  async removeProfilePicture(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/profile/picture', {
      method: 'DELETE',
    });
  },

  async loginWithGoogle(credentialOrPayload: string | { credential?: string; accessToken?: string }): Promise<AuthResponse> {
    const body = typeof credentialOrPayload === 'string'
      ? { credential: credentialOrPayload }
      : credentialOrPayload;
    return apiRequest<AuthResponse>('/users/google-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
