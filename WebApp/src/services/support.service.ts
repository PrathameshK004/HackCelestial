import { apiRequest } from './apiClient';

export interface SupportTicketPayload {
  category: string;
  subject: string;
  message: string;
  attachment?: File | null;
}

export interface SupportTicketResponse {
  ticketNumber: string;
  createdAt: string;
}

export interface SupportTicketSummary {
  ticketNumber: string;
  category: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  attachmentName?: string | null;
  createdAt: string;
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
