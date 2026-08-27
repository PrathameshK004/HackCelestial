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
