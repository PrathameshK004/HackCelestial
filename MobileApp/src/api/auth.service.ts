/**
 * Authentication Service
 * Reuses existing backend API contracts
 */

import { apiRequest } from './apiClient';
import { AuthResponse, LoginPayload, RegisterUserPayload, User } from '../types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  async register(payload: RegisterUserPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerUser', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  async sendOtp(payload: { emailId: string; purpose?: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/sendOtp', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        purpose: payload.purpose || 'REGISTER',
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

  async resetPassword(payload: { emailId: string; newPassword: string; resetToken?: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { oldPassword?: string; currentPassword?: string; newPassword: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};
