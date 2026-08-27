export type TripType = 'Friends' | 'Family' | 'Corporate' | 'Student' | 'Other';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type ExpenseSplit = 'equal' | 'participant' | 'organizer' | 'custom';

export interface Traveler {
  id: string | number;
  name: string;
  email: string;
  role: 'Organizer' | 'Traveler' | 'Admin';
  avatarBg?: string;
  isRegistered?: boolean;
  userId?: string | null;
  upiId?: string;
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
  inviteCode: string;
  inviteUrl: string;
  shareLinks: ShareLinks;
  members: Traveler[];
  createdAt: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  currency: Currency;
  status?: 'ACTIVE' | 'SETTLED';
  memberCount: string | number;
  createdAt: string;
}

export interface SettlementTransfer {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  amount: string;
}

export interface SettlementData {
  members: Traveler[];
  expenses: Array<{ id: string; description: string; amount: string; paidBy: string; paidByName?: string; createdBy?: string; createdByName?: string; shares: Array<{ memberId: string; amountCents: number }>; paymentMethod?: 'CASH' | 'UPI'; paymentReference?: string; createdAt: string }>;
  transfers: SettlementTransfer[];
  settlementHistory?: Array<{ id: string; amount: string; paymentMethod: 'CASH' | 'UPI'; remarks: string; createdAt: string; paidByName: string; paidToName: string }>;
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
      upiId?: string | null;
    } | null;
  };
  statusCode: number;
}
