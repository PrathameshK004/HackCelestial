import {
  TripFormData, 
  CreatedGroupData, 
  CheckRegisteredUserResponse,
  ShareLinks,
  GroupSummary,
  SettlementData
} from '../types/group';
import { apiRequest } from './apiClient';

export const groupService = {
  /**
   * Check if an email or username belongs to a registered platform user
   */
  async checkRegisteredUser(emailOrUsername: string): Promise<CheckRegisteredUserResponse> {
    return apiRequest<CheckRegisteredUserResponse>('/users/check-registered', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrUsername.trim().toLowerCase() }),
    });
  },

  /**
   * Create a new group trip with full details, members, and auto-generated invites
   */
  async createGroup(formData: TripFormData): Promise<{ err?: any; message: string; data: CreatedGroupData }> {
    return apiRequest<{ err?: any; message: string; data: CreatedGroupData }>('/groups', {
      method: 'POST',
      body: JSON.stringify({
        groupName: formData.groupName.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        tripType: formData.tripType,
        currency: formData.currency,
        expenseSplit: formData.expenseSplit,
        description: formData.description?.trim() || '',
        travelers: formData.travelers.map(t => ({
          name: t.name.trim(),
          email: t.email.trim().toLowerCase(),
          role: t.role,
          avatarBg: t.avatarBg,
          upiId: t.upiId,
        })),
      }),
    });
  },

  /**
   * Fetch group details by ID
   */
  async getGroupById(groupId: string): Promise<{ err?: any; message: string; data: CreatedGroupData }> {
    return apiRequest<{ err?: any; message: string; data: CreatedGroupData }>(`/groups/${groupId}`, {
      method: 'GET',
    });
  },

  /**
   * Get all trips for the authenticated user
   */
  async getMyGroups(): Promise<{ err?: any; message: string; data: GroupSummary[] }> {
    return apiRequest<{ err?: any; message: string; data: GroupSummary[] }>('/groups/my-groups', {
      method: 'GET',
    });
  },

  async getSettlement(groupId: string): Promise<{ data: SettlementData }> {
    return apiRequest<{ data: SettlementData }>(`/groups/${groupId}/settlement`);
  },

  async addExpense(groupId: string, expense: { description: string; amount: string; participants: string[]; paymentMethod: 'CASH' | 'UPI'; paymentReference?: string }) {
    return apiRequest<{ data: unknown }>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async settleGroup(groupId: string) {
    return apiRequest<{ data: unknown }>(`/groups/${groupId}/settle`, { method: 'POST' });
  },

  async recordSettlement(groupId: string, payment: { paidTo: string; amount: string; remarks: string; paymentMethod: 'CASH' | 'UPI'; paymentReference?: string }) {
    return apiRequest<{ data: unknown }>(`/groups/${groupId}/settlement-payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  },

  /**
   * Generate an invite link for an unregistered user
   */
  async createInvite(groupId: string, email?: string, sendDirectEmail: boolean = false): Promise<{
    err?: any;
    message: string;
    data: {
      inviteCode: string;
      inviteUrl: string;
      expiresAt: string;
      shareLinks: ShareLinks;
    };
  }> {
    return apiRequest<{
      err?: any;
      message: string;
      data: {
        inviteCode: string;
        inviteUrl: string;
        expiresAt: string;
        shareLinks: ShareLinks;
      };
    }>(`/groups/${groupId}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        email: email ? email.trim().toLowerCase() : undefined,
        sendDirectEmail,
      }),
    });
  },

  /**
   * Public preview of invite link
   */
  async getInviteDetails(inviteCode: string): Promise<{ err?: any; message: string; data: any }> {
    return apiRequest<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}`, {
      method: 'GET',
    });
  },

  /**
   * Accept an invitation code and join group
   */
  async acceptInvite(inviteCode: string): Promise<{ err?: any; message: string; data: any }> {
    return apiRequest<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}/accept`, {
      method: 'POST',
    });
  },
};
