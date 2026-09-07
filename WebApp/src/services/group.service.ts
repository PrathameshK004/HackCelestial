import { apiRequest } from './apiClient';
import { 
  TripFormData, 
  CreatedGroupData, 
  CheckRegisteredUserResponse,
  ShareLinks,
  SettlementData,
  SettlementExpense
} from '../types/group';

interface RequestOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, options);
}

export const groupService = {
  /**
   * Check if an email or username belongs to a registered platform user
   */
  async checkRegisteredUser(emailOrUsername: string): Promise<CheckRegisteredUserResponse> {
    return request<CheckRegisteredUserResponse>('/users/check-registered', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrUsername.trim().toLowerCase() }),
    });
  },

  /**
   * Create a new group trip with full details, members, and auto-generated invites
   */
  async createGroup(formData: TripFormData): Promise<{ err?: any; message: string; data: CreatedGroupData }> {
    return request<{ err?: any; message: string; data: CreatedGroupData }>('/groups', {
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
        })),
        payment: formData.payment || null,
      }),
    });
  },

  /**
   * Fetch group details by ID
   */
  async getGroupById(groupId: string): Promise<{ err?: any; message: string; data: CreatedGroupData }> {
    return request<{ err?: any; message: string; data: CreatedGroupData }>(`/groups/${groupId}`, {
      method: 'GET',
    });
  },

  /**
   * Get all trips for the authenticated user
   */
  async getMyGroups(): Promise<{ err?: any; message: string; data: any[] }> {
    return request<{ err?: any; message: string; data: any[] }>('/groups/my-groups', {
      method: 'GET',
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
    return request<{
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
    return request<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}`, {
      method: 'GET',
    });
  },

  /**
   * Accept an invitation code and join group (approves membership)
   */
  async acceptInvite(inviteCode: string): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Reject / decline an invitation
   */
  async rejectInvite(inviteCode: string): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Get all pending invitations for currently logged-in user
   */
  async getMyPendingInvitations(): Promise<{ err?: any; message: string; data: any[] }> {
    return request<{ err?: any; message: string; data: any[] }>('/invites/my-pending', {
      method: 'GET',
    });
  },

  /**
   * Resend official invitation email to a participant
   */
  async resendInvite(groupId: string, email: string): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/groups/${groupId}/invites/resend`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  },

  async addExpense(groupId: string, payload: {
    description: string;
    amount: string | number;
    category?: string;
    currency?: string;
    splitModel?: 'EQUAL' | 'PARTICIPANT_BASED' | 'ROOM_SHARE' | 'ACTIVITY_BASED' | 'ORGANIZER_PAID';
    paidByMemberId?: string;
    participants?: (string | {
      memberId: string;
      shareType?: string;
      shareValue?: number;
      isOptedIn?: boolean;
    })[];
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<{ message: string; data: SettlementExpense }> {
    return request<{ message: string; data: SettlementExpense }>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getExpenses(groupId: string): Promise<{ message: string; data: SettlementExpense[] }> {
    return request<{ message: string; data: SettlementExpense[] }>(`/groups/${groupId}/expenses`, {
      method: 'GET',
    });
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<{ message: string; data: any }> {
    return request<{ message: string; data: any }>(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async getSettlement(groupId: string): Promise<{ message: string; data: SettlementData }> {
    return request<{ message: string; data: SettlementData }>(`/groups/${groupId}/settlement`, {
      method: 'GET',
    });
  },

  async recordSettlement(groupId: string, payload: {
    fromMemberId?: string;
    paidTo: string;
    amount: string | number;
    currency?: string;
    remarks?: string;
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<{ message: string; data: any }> {
    return request<{ message: string; data: any }>(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async settleGroup(groupId: string): Promise<{ message: string; data: any }> {
    return request<{ message: string; data: any }>(`/groups/${groupId}/settle`, {
      method: 'POST',
    });
  },

  async getAuditLog(groupId: string): Promise<{ message: string; data: any[] }> {
    return request<{ message: string; data: any[] }>(`/groups/${groupId}/audit-log`, {
      method: 'GET',
    });
  },

  async addGroupMember(groupId: string, member: {
    name: string;
    email: string;
    role?: string;
    avatarBg?: string;
  }): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all real payments, expenses, and settlements for current user across all trips
   */
  async getUserPayments(): Promise<{
    message: string;
    data: {
      totalSpent: number;
      totalReceived: number;
      count: number;
      transactions: any[];
    };
  }> {
    return request('/payments/my-payments', {
      method: 'GET',
    });
  },

  /**
   * Record a payment:
   * - Trip Expense with automatic splitting according to group's split ratio
   * - Or companion settlement resolving trip debt
   */
  async recordUnifiedPayment(payload: {
    groupId: string;
    type?: 'EXPENSE' | 'SETTLEMENT';
    description?: string;
    amount: number | string;
    category?: string;
    currency?: string;
    paymentMethod?: string;
    paymentReference?: string;
    toMemberId?: string;
    splitModel?: string;
  }): Promise<{ message: string; data: any }> {
    return request('/payments/record', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Official Payment Gateway Callback / Status Verification
   * Verifies UPI payment return callback and records expense to group
   */
  async verifyUpiPaymentStatus(payload: {
    txnRef: string;
    groupId: string;
    amount: number | string;
    description?: string;
    category?: string;
    paymentMethod?: string;
    utr?: string;
    vendorUpi?: string;
    vendorName?: string;
  }): Promise<{ message: string; data: any }> {
    return request('/payments/verify-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};


