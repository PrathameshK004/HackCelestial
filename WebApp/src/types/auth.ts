export interface User {
  userId: string;
  username: string;
  emailId: string;
}

export interface AuthResponse {
  status: number;
  message: string;
  data?: {
    userId: string;
    username: string;
    emailId?: string;
    accessToken?: string;
    refreshToken?: string;
    isAuthenticated?: boolean;
    userKey?: string;
  };
}

export interface LoginPayload {
  emailId: string;
  password: string;
}

export interface RegisterTempPayload {
  username: string;
  emailId: string;
  password: string;
}

export interface RegisterUserPayload {
  username: string;
  emailId: string;
  password: string;
  code: string;
}

export interface SendOtpPayload {
  emailId: string;
  purpose: string;
}
