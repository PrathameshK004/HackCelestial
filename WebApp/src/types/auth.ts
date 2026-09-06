export interface User {
  userId: string;
  username: string;
  emailId: string;
  upiId?: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  emailId: string;
}

export interface VerifyResetOtpPayload {
  emailId: string;
  code: string;
}

export interface ResetPasswordPayload extends VerifyResetOtpPayload {
  newPassword: string;
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
