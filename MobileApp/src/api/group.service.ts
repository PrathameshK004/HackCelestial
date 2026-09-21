/**
 * Group / Trip API Service
 * Reuses existing backend API contracts
 */

import { apiRequest } from './apiClient';

export const groupService = {
  async checkRegisteredUser(emailOrUsername: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/users/check-registered', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrUsername.trim().toLowerCase() }),
    });
  },

  async getMyGroups(): Promise<{ message: string; data: any[] }> {
    return apiRequest<{ message: string; data: any[] }>('/groups/my-groups', {
      method: 'GET',
    });
  },

  async getGroupById(groupId: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}`, {
      method: 'GET',
    });
  },

  async createGroup(payload: {
    groupName: string;
    destination: string;
    startDate?: string | null;
    endDate?: string | null;
    tripType?: string;
    currency?: string;
    expenseSplit?: string;
    description?: string;
    travelers?: Array<{ name: string; email: string; role?: string; avatarBg?: string; isRegistered?: boolean; status?: string }>;
    payment?: any;
  }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async addExpense(groupId: string, payload: {
    description: string;
    amount: number | string;
    category?: string;
    currency?: string;
    splitModel?: string;
    paidByMemberId?: string;
    participants?: any[];
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getExpenses(groupId: string): Promise<{ message: string; data: any[] }> {
    return apiRequest<{ message: string; data: any[] }>(`/groups/${groupId}/expenses`, {
      method: 'GET',
    });
  },

  async deleteExpense(groupId: string, expenseId: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async getSettlement(groupId: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/settlement`, {
      method: 'GET',
    });
  },

  async recordSettlement(groupId: string, payload: {
    fromMemberId?: string;
    paidTo: string;
    amount: number | string;
    currency?: string;
    remarks?: string;
    paymentMethod?: string;
    paymentReference?: string;
  }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async addGroupMember(groupId: string, member: {
    name: string;
    email: string;
    role?: string;
    avatarBg?: string;
  }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },

  async createInvite(groupId: string, email?: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/groups/${groupId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getInviteDetails(inviteCode: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/invites/${inviteCode}`, {
      method: 'GET',
    });
  },

  async acceptInvite(inviteCode: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/invites/${inviteCode}/accept`, {
      method: 'POST',
    });
  },

  async rejectInvite(inviteCode: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/invites/${inviteCode}/reject`, {
      method: 'POST',
    });
  },

  async getMyPendingInvitations(): Promise<{ message: string; data: any[] }> {
    return apiRequest<{ message: string; data: any[] }>('/invites/my-pending', {
      method: 'GET',
    });
  },

  async getUserPayments(): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/payments/my-payments', {
      method: 'GET',
    });
  },

  async createRazorpayOrder(payload: { amount: number; currency?: string; receipt?: string; notes?: any }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/payments/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyRazorpayPayment(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string }): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/payments/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};

