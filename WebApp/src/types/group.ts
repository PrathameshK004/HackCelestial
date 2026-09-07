export type TripType = 'Friends' | 'Family' | 'Corporate' | 'Student' | 'Other';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type ExpenseSplit = 'equal' | 'participant' | 'organizer' | 'custom';

export type TravelerStatus = 'ACCEPTED' | 'PENDING' | 'REJECTED';

export interface Traveler {
  id: string | number;
  name: string;
  email: string;
  role: 'Organizer' | 'Traveler' | 'Admin';
  avatarBg?: string;
  isRegistered?: boolean;
  userId?: string | null;
  status?: TravelerStatus;
  inviteCode?: string;
  inviteUrl?: string;
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
  tripType: TripType;
  currency: Currency;
  expenseSplit: ExpenseSplit;
  organizerName: string;
}

export interface InviteDetails {
  inviteCode: string;
  groupId: string;
  groupName: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: TripType;
  currency: Currency;
  expenseSplit: ExpenseSplit;
  description?: string;
  organizerName: string;
  invitedEmail?: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  memberCount: number;
  members?: Traveler[];
  expiresAt: string;
}

export interface PaymentDetails {
  status: 'PAID' | 'FREE' | 'PENDING';
  amount: number;
  currency: string;
  transactionId?: string;
  paymentMethod?: 'UPI' | 'CARD' | 'NET_BANKING';
  paidAt?: string;
}

export interface TripFormData {
  groupName: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType: TripType;
  currency: Currency;
  expenseSplit: ExpenseSplit;
  description: string;
  travelers: Traveler[];
  payment?: PaymentDetails;
}

export interface DestinationOption {
  city: string;
  country: string;
  tag: string;
  image?: string;
}

export interface ShareLinks {
  whatsapp: string;
  telegram: string;
  sms: string;
  email?: string;
  copyLink: string;
}

export interface CreatedGroupData {
  groupId: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: TripType;
  currency: Currency;
  expenseSplit: ExpenseSplit;
  description: string;
  memberTier?: 'FREE' | 'PREMIUM';
  paymentStatus?: string;
  paymentAmount?: number;
  paymentTransactionId?: string;
  paidAt?: string;
  inviteCode: string;
  inviteUrl: string;
  shareLinks: ShareLinks;
  members: Traveler[];
  createdAt: string;
}

export interface CheckRegisteredUserResponse {
  err?: any;
  message?: string;
  data: {
    exists: boolean;
    isRegistered: boolean;
    user: {
      id: string;
      username: string;
      email: string;
    } | null;
  };
  statusCode: number;
}

export interface GroupSummary {
  id: string;
  name: string;
  destination: string;
  currency: Currency;
  startDate: string | null;
  endDate: string | null;
  memberCount: number;
  status: 'ACTIVE' | 'SETTLED';
  createdAt: string;
  expenseSplit?: ExpenseSplit;
  tripType?: TripType;
  members?: Traveler[];
}

export interface SettlementMember extends Omit<Traveler, 'status'> {
  upiId?: string;
  netBalance?: number;
  totalPaid?: number;
  totalOwed?: number;
  status?: string;
}

export interface ExpenseSplitDetail {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  shareType: string;
  shareValue: number;
  computedAmount: number;
}

export interface SettlementExpense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  currency?: string;
  splitModel?: string;
  paidBy: {
    id: string;
    name: string;
    role?: string;
    avatarBg?: string;
  };
  paidByName?: string;
  paymentMethod?: string;
  paymentReference?: string;
  splits?: ExpenseSplitDetail[];
  shares?: string[];
  createdAt: string;
}

export interface SettlementTransfer {
  id?: string;
  fromMemberId?: string;
  toMemberId?: string;
  from: string | {
    id: string;
    name: string;
    avatarBg?: string;
    email?: string;
  };
  to: string | {
    id: string;
    name: string;
    avatarBg?: string;
    email?: string;
    upiId?: string;
  };
  fromName?: string;
  toName?: string;
  amount: number;
  currency?: string;
  currencySymbol?: string;
}

export interface SettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  remarks?: string;
  settledAt: string;
}

export interface AuditLogEntry {
  id: string;
  eventType: string;
  actorName: string;
  description: string;
  changeDiff?: any;
  createdAt: string;
}

export interface SettlementData {
  groupId?: string;
  groupName?: string;
  groupStatus?: 'ACTIVE' | 'SETTLED';
  currency?: Currency;
  totalSpend?: number;
  members: SettlementMember[];
  expenses: SettlementExpense[];
  transfers: SettlementTransfer[];
  settlements?: SettlementRecord[];
}

