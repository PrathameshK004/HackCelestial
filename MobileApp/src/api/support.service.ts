import { apiRequest, API_BASE } from "./apiClient";
import { cacheDirectory, copyAsync } from "expo-file-system/legacy";

export type SupportStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | string;

export interface SupportTicketSummary {
  id?: string;
  ticketNumber: string;
  category: string;
  subject: string;
  message: string;
  status: SupportStatus;
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
  senderRole: "USER" | "SUPPORT" | "SYSTEM" | string;
  message?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

export interface SupportAttachment {
  uri: string;
  name: string;
  type: string;
}

export interface SupportAssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SupportAssistantReply {
  answer: string;
  sources: string[];
}

export async function askSupportAssistant(
  messages: SupportAssistantMessage[],
): Promise<SupportAssistantReply> {
  const response = await apiRequest<{ data: SupportAssistantReply }>(
    "/support/assistant",
    {
      method: "POST",
      body: JSON.stringify({ messages: messages.slice(-8) }),
      timeoutMs: 25000,
    },
  );
  return response.data;
}

async function appendAttachment(
  formData: FormData,
  fieldName: string,
  attachment?: SupportAttachment | null,
) {
  if (!attachment?.uri) return;
  const fileResponse = await fetch(attachment.uri);
  const fileBlob = await fileResponse.blob();
  formData.append(
    fieldName,
    fileBlob,
    attachment.name || `support-${Date.now()}.jpg`,
  );
}

async function normalizeAttachment(
  attachment?: SupportAttachment | null,
): Promise<SupportAttachment | null> {
  if (!attachment?.uri) return null;
  if (!cacheDirectory || attachment.uri.startsWith(cacheDirectory))
    return attachment;

  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const targetUri = `${cacheDirectory}support-${Date.now()}-${safeName}`;
  try {
    await copyAsync({ from: attachment.uri, to: targetUri });
    return { ...attachment, uri: targetUri };
  } catch {
    return attachment;
  }
}

export async function listSupportTickets(): Promise<SupportTicketSummary[]> {
  const response = await apiRequest<{ data: SupportTicketSummary[] }>(
    "/support/tickets",
    { method: "GET" },
  );
  return response.data || [];
}

export async function createSupportTicket(input: {
  category: string;
  subject: string;
  message: string;
  attachment?: SupportAttachment | null;
}) {
  const body = new FormData();
  body.append("category", input.category);
  body.append("subject", input.subject.trim());
  body.append("message", input.message.trim());
  await appendAttachment(
    body,
    "attachment",
    await normalizeAttachment(input.attachment),
  );
  const response = await apiRequest<{ data: SupportTicketSummary }>(
    "/support/tickets",
    { method: "POST", body },
  );
  return response.data;
}

export async function getTicketMessages(ticketNumber: string) {
  const response = await apiRequest<{
    data: { ticket: SupportTicketSummary; messages: TicketMessage[] };
  }>(`/support/tickets/${encodeURIComponent(ticketNumber)}/messages`, {
    method: "GET",
  });
  return response.data;
}

export async function sendTicketMessage(
  ticketNumber: string,
  message?: string,
  attachment?: SupportAttachment | null,
) {
  const body = new FormData();
  if (message?.trim()) body.append("message", message.trim());
  await appendAttachment(
    body,
    "attachment",
    await normalizeAttachment(attachment),
  );
  const response = await apiRequest<{ data: TicketMessage }>(
    `/support/tickets/${encodeURIComponent(ticketNumber)}/messages`,
    { method: "POST", body },
  );
  return response.data;
}

export async function updateSupportTicketStatus(
  ticketNumber: string,
  status: "RESOLVED" | "OPEN" | "CLOSED",
) {
  const response = await apiRequest<{ data: SupportTicketSummary }>(
    `/support/tickets/${encodeURIComponent(ticketNumber)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return response.data;
}

export function getTicketAttachmentUrl(
  ticketNumber: string,
  directUrl?: string | null,
) {
  if (directUrl?.startsWith("http")) return directUrl;
  return `${API_BASE}/support/tickets/${encodeURIComponent(ticketNumber)}/attachment`;
}
