import { 
  AuthResponse, 
  LoginPayload, 
  RegisterTempPayload, 
  RegisterUserPayload, 
  SendOtpPayload,
  ForgotPasswordPayload,
  VerifyResetOtpPayload,
  ResetPasswordPayload,
  ChangePasswordPayload
} from '../types/auth';
import { apiRequest } from './apiClient';

export const authService = {
  /**
   * Validate user login credentials
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/login', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Authenticate with Google Credential / ID Token
   */
  async googleAuth(credential: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/google-auth', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({ credential }),
    });
  },

  /**
   * Register temporary user and dispatch OTP
   */
  async registerTempUser(payload: RegisterTempPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerTempUser', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
        upiId: payload.upiId?.trim() || undefined,
      }),
    });
  },

  /**
   * Verify registration OTP and activate user account
   */
  async verifyAndRegisterUser(payload: RegisterUserPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/registerUser', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
        code: payload.code.trim(),
      }),
    });
  },

  /**
   * Send or resend OTP for verification
   */
  async sendOtp(payload: SendOtpPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/sendOtp', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        purpose: payload.purpose || 'Sign Up',
      }),
    });
  },

  /**
   * Check authentication status
   */
  async checkAuth(token?: string | null): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/checkAuth', {
      method: 'GET',
      token,
    });
  },

  /**
   * Logout user and invalidate session
   */
  async logout(): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/logout', {
      method: 'GET',
      skipAuthRefresh: true,
    });
  },

  /**
   * Get user details by ID
   */
  async getUserById(userId: string, token?: string | null): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`/users/${userId}`, {
      method: 'GET',
      token,
    });
  },

  /**
   * Update user details (username, upiId)
   */
  async updateProfile(userId: string, payload: { username: string; upiId: string }, token?: string | null): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`/users/${userId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ username: payload.username.trim(), upiId: payload.upiId.trim().toLowerCase() }),
    });
  },

  /**
   * Request password reset OTP
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/forgotPassword', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
      }),
    });
  },

  /**
   * Verify password reset OTP code
   */
  async verifyResetOtp(payload: VerifyResetOtpPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/verifyResetOtp', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        code: payload.code.trim(),
      }),
    });
  },

  /**
   * Complete password reset with verified OTP & new password
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/resetPassword', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        code: payload.code.trim(),
        newPassword: payload.newPassword,
      }),
    });
  },

  /**
   * Change password for logged-in user
   */
  async changePassword(payload: ChangePasswordPayload, token?: string | null): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/users/changePassword', {
      method: 'PUT',
      token,
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    });
  },
};
