/**
 * Data Contracts & Types
 * Matching WebApp/src/types/group.ts and WebApp/src/types/auth.ts
 */

export interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  emailId?: string;
  phone?: string | null;
  avatar?: string | null;
  avatarBg?: string;
  upiId?: string | null;
  travelStyle?: 'Boutique' | 'Coastal' | 'Nature' | 'Urban' | 'Mountain' | string;
  currency?: string;
  dob?: string | null;
}

export interface AuthResponse {
  err?: any;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: User;
    userKey?: string;
    isAuthenticated?: boolean;
    otpSent?: boolean;
    verificationRequired?: boolean;
    expiresIn?: number;
    emailId?: string;
    otp?: string | number;
  };
  statusCode?: number;
}

export interface LoginPayload {
  emailId: string;
  password?: string;
}

/** Step 1: Create temporary (pending) user + trigger OTP email */
export interface RegisterTempPayload {
  username: string;
  emailId: string;
  password: string;
}

/** Step 2: Verify OTP code + activate account */
export interface VerifyRegisterPayload {
  username: string;
  emailId: string;
  password: string;
  code: string;
}

/** Legacy alias kept for backward compatibility */
export interface RegisterUserPayload {
  username: string;
  emailId: string;
  password?: string;
  code?: string;
}

export type CostSharingModel = 
  | 'EQUAL' 
  | 'PARTICIPANT_BASED' 
  | 'ROOM_SHARE' 
  | 'ACTIVITY_BASED' 
  | 'ORGANIZER_PAID';

export interface Participant {
  id: string;
  tripId: string;
  userId?: string;
  name: string;
  email?: string;
  role: 'Organizer' | 'Traveler';
  avatarBg: string;
  isUser?: boolean;
  balance: number;
  status?: 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'DECLINED';
  inviteCode?: string;
  inviteUrl?: string;
  syncStatus?: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY';
}

export interface ExpenseParticipantSplit {
  id: string;
  expenseId: string;
  participantId: string;
  shareAmount: number;
  isOptedIn: boolean;
  shareType?: string;
  shareValue?: number;
  syncStatus?: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY';
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: 'Stay' | 'Food' | 'Transport' | 'Activities' | 'Supplies' | 'Other';
  paidById: string;
  paidByName: string;
  splitModel: CostSharingModel;
  splitCount: number;
  paymentMethod: 'CASH' | 'UPI';
  paymentReference?: string;
  date: string;
  time: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY';
  splits?: ExpenseParticipantSplit[];
}

export interface SettlementTransfer {
  id: string;
  tripId: string;
  fromMemberId: string;
  fromMemberName: string;
  fromAvatarBg?: string;
  toMemberId: string;
  toMemberName: string;
  toAvatarBg?: string;
  toUpiId?: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  status: 'pending' | 'completed';
  paymentMethod?: string;
  paymentReference?: string;
  remarks?: string;
  dueDate?: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY';
  createdAt?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  tripType: 'Friends' | 'Family' | 'Corporate' | 'Student' | 'Other';
  status: 'active' | 'upcoming' | 'completed';
  startDate?: string;
  endDate?: string;
  currency: string;
  currencySymbol: string;
  totalBudget: number;
  totalSpent: number;
  userBalance: number;
  inviteCode?: string;
  description?: string;
  coverGradient?: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'LOCAL_ONLY';
  members?: Participant[];
  expenses?: Expense[];
  settlements?: SettlementTransfer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'TRIP' | 'EXPENSE' | 'MEMBER' | 'SETTLEMENT' | 'PAYMENT';
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  httpMethod: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: string; // JSON stringified
  idempotencyKey?: string;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'RESOLVED';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptimalSettlementResult {
  transfers: SettlementTransfer[];
  originalTxCount: number;
  optimizedTxCount: number;
  totalVolume: number;
  reductionPercentage: number;
}

export interface PendingInvitation {
  id: string;
  inviteCode: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  groupId: string;
  groupName: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: string;
  currency: string;
  expenseSplit: string;
  organizerName: string;
  memberCount?: number;
}

export interface InviteDetails {
  inviteCode: string;
  groupId: string;
  groupName: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: string;
  currency: string;
  expenseSplit: string;
  description?: string;
  organizerName: string;
  invitedEmail?: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  memberCount: number;
  members?: Array<{
    id: string | number;
    name: string;
    email: string;
    role: 'Organizer' | 'Traveler' | 'Admin';
    avatarBg?: string;
    status?: 'ACCEPTED' | 'PENDING' | 'REJECTED';
  }>;
  expiresAt: string;
}

export interface InboxNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  category: 'trip' | 'expense' | 'security' | 'system';
  actionTab?: 'explore' | 'trips' | 'expenses' | 'payments';
}

