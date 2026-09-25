import { apiRequest, API_BASE } from './apiClient';

export interface SupportTicketPayload {
  category: string;
  subject: string;
  message: string;
  attachment?: File | null;
}

export interface SupportTicketResponse {
  ticketNumber: string;
  createdAt: string;
  status: string;
  subject: string;
  category: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

export interface SupportTicketSummary {
  id?: string;
  ticketNumber: string;
  category: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderName: string;
  senderRole: 'USER' | 'SUPPORT' | 'SYSTEM' | string;
  message?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
}

export interface TicketChatResponse {
  ticket: SupportTicketSummary;
  messages: TicketMessage[];
}

export async function createSupportTicket(payload: SupportTicketPayload): Promise<SupportTicketResponse> {
  const formData = new FormData();
  formData.append('category', payload.category);
  formData.append('subject', payload.subject.trim());
  formData.append('message', payload.message.trim());
  if (payload.attachment) formData.append('attachment', payload.attachment);

  const response = await apiRequest<{ data: SupportTicketResponse }>('/support/tickets', {
    method: 'POST',
    body: formData
  });
  return response.data;
}

export async function listSupportTickets(): Promise<SupportTicketSummary[]> {
  const response = await apiRequest<{ data: SupportTicketSummary[] }>('/support/tickets', { method: 'GET' });
  return response.data || [];
}

export async function updateSupportTicketStatus(
  ticketNumber: string,
  status: 'RESOLVED' | 'OPEN' | 'CLOSED'
): Promise<SupportTicketSummary> {
  const response = await apiRequest<{ data: SupportTicketSummary }>(`/support/tickets/${encodeURIComponent(ticketNumber)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  return response.data;
}

export async function getTicketMessages(ticketNumber: string): Promise<TicketChatResponse> {
  const response = await apiRequest<{ data: TicketChatResponse }>(`/support/tickets/${encodeURIComponent(ticketNumber)}/messages`, {
    method: 'GET'
  });
  return response.data;
}

export async function sendTicketMessage(
  ticketNumber: string,
  message?: string,
  attachment?: File | null
): Promise<TicketMessage> {
  const formData = new FormData();
  if (message && message.trim()) {
    formData.append('message', message.trim());
  }
  if (attachment) {
    formData.append('attachment', attachment);
  }

  const response = await apiRequest<{ data: TicketMessage }>(`/support/tickets/${encodeURIComponent(ticketNumber)}/messages`, {
    method: 'POST',
    body: formData
  });
  return response.data;
}

export function getTicketAttachmentUrl(ticketNumber: string, directUrl?: string | null): string {
  if (directUrl && (directUrl.startsWith('http://') || directUrl.startsWith('https://'))) {
    return directUrl;
  }
  if (directUrl && directUrl.startsWith('/uploads')) {
    // If running with proxy or direct
    return directUrl;
  }
  return `${API_BASE}/support/tickets/${encodeURIComponent(ticketNumber)}/attachment`;
}
