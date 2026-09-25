export interface User {
  userId: string;
  id?: string;
  username: string;
  emailId: string;
  phone?: string;
  upiId?: string;
  avatar?: string;
  travelStyle?: string;
  currency?: string;
  dob?: string | null;
  twoFactorEnabled?: boolean;
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
    avatar?: string;
    user?: User;
    twoFactorRequired?: boolean;
    twoFactorEnabled?: boolean;
    phone?: string | null;
    upiId?: string | null;
    travelStyle?: string;
    currency?: string;
    dob?: string | null;
    expiresIn?: number;
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
