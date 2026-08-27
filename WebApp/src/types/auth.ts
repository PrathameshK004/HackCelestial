export interface User {
  userId: string;
  username: string;
  emailId: string;
  upiId?: string;
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
    upiId?: string;
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
  upiId: string;
}

export interface RegisterUserPayload {
  username: string;
  emailId: string;
  password: string;
  code: string;
  upiId: string;
}

export interface SendOtpPayload {
  emailId: string;
  purpose: string;
}
