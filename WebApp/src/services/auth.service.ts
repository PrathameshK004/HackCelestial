import { 
  AuthResponse, 
  LoginPayload, 
  RegisterTempPayload, 
  RegisterUserPayload, 
  SendOtpPayload 
} from '../types/auth';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

/**
 * Standard fetch helper with robust JSON parsing and error extraction
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include',
    });
  } catch (netErr: any) {
    console.error('Fetch network error:', netErr);
    const error = new Error('Cannot reach backend server. Please make sure the backend is running on port 4000.');
    (error as any).status = 503;
    throw error;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseErr) {
      data = { message: response.statusText || 'Response parsing failed' };
    }
  } else {
    const text = await response.text();
    data = { message: text || response.statusText };
  }

  if (!response.ok) {
    const errorMessage = 
      data?.err?.message ||
      data?.message || 
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
      (Array.isArray(data?.data?.errors) ? data.data.errors.join(', ') : null) || 
      (typeof data?.err === 'string' ? data.err : null) ||
      `Request failed with status ${response.status}`;
      
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
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
};
