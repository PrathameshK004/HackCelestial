import {
  TripFormData, 
  CreatedGroupData, 
  CheckRegisteredUserResponse,
  ShareLinks,
  GroupSummary,
  SettlementData
} from '../types/group';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers = {}, ...restOptions } = options;

  const authToken = token || localStorage.getItem('triptual_auth_token');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...restOptions,
      headers: requestHeaders,
      credentials: 'include',
    });
  } catch (netErr: any) {
    console.error('Group API network error:', netErr);
    throw new Error('Cannot connect to backend server. Please verify port 4000.');
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text || response.statusText };
  }

  if (!response.ok) {
    const errorMessage =
      data?.err?.message ||
      data?.message ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
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
          upiId: t.upiId,
        })),
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
  async getMyGroups(): Promise<{ err?: any; message: string; data: GroupSummary[] }> {
    return request<{ err?: any; message: string; data: GroupSummary[] }>('/groups/my-groups', {
      method: 'GET',
    });
  },

  async getSettlement(groupId: string): Promise<{ data: SettlementData }> {
    return request<{ data: SettlementData }>(`/groups/${groupId}/settlement`);
  },

  async addExpense(groupId: string, expense: { description: string; amount: string; participants: string[]; paymentMethod: 'CASH' | 'UPI'; paymentReference?: string }) {
    return request<{ data: unknown }>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async settleGroup(groupId: string) {
    return request<{ data: unknown }>(`/groups/${groupId}/settle`, { method: 'POST' });
  },

  async recordSettlement(groupId: string, payment: { paidTo: string; amount: string; remarks: string; paymentMethod: 'CASH' | 'UPI'; paymentReference?: string }) {
    return request<{ data: unknown }>(`/groups/${groupId}/settlement-payments`, {
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
   * Accept an invitation code and join group
   */
  async acceptInvite(inviteCode: string): Promise<{ err?: any; message: string; data: any }> {
    return request<{ err?: any; message: string; data: any }>(`/invites/${inviteCode}/accept`, {
      method: 'POST',
    });
  },
};
