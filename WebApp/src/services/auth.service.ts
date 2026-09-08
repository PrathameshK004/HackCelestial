import { apiRequest } from './apiClient';
import { 
  User,
  AuthResponse, 
  LoginPayload, 
  RegisterTempPayload, 
  RegisterUserPayload, 
  SendOtpPayload,
  PasswordChangePayload,
  ForgotPasswordPayload,
  VerifyResetOtpPayload,
  ResetPasswordPayload
} from '../types/auth';

interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
}

/**
 * Standard request helper routed through centralized apiRequest
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, options);
}

export const authService = {
  /**
   * Validate user login credentials
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Register temporary user & trigger OTP send
   */
  async registerTempUser(payload: RegisterTempPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/registerTempUser', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        emailId: payload.emailId.trim().toLowerCase(),
        password: payload.password,
      }),
    });
  },

  /**
   * Complete user registration with verified OTP
   */
  async verifyAndRegisterUser(payload: RegisterUserPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/registerUser', {
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
   * Resend or send OTP for verification / login
   */
  async sendOtp(payload: SendOtpPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/sendOtp', {
      method: 'POST',
      body: JSON.stringify({
        emailId: payload.emailId.trim().toLowerCase(),
        purpose: payload.purpose,
      }),
    });
  },

  /**
   * Check token validity
   */
  async checkAuth(token: string): Promise<AuthResponse> {
    return request<AuthResponse>('/users/checkAuth', {
      method: 'GET',
      token,
    });
  },

  /**
   * Logout user from session
   */
  async logout(): Promise<AuthResponse> {
    return request<AuthResponse>('/users/logout', {
      method: 'GET',
    });
  },

  /**
   * Fetch user details by ID
   */
  async getUserById(userId: string, token: string): Promise<AuthResponse> {
    return request<AuthResponse>(`/users/${userId}`, {
      method: 'GET',
      token,
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ emailId: payload.emailId.trim().toLowerCase() }),
    });
  },

  async verifyResetOtp(payload: VerifyResetOtpPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: PasswordChangePayload): Promise<AuthResponse> {
    return request<AuthResponse>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProfile(payload: Partial<User>): Promise<AuthResponse> {
    return request<AuthResponse>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    return request<AuthResponse>('/users/google-login', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },
};
