import { io, Socket } from 'socket.io-client';
import { API_BASE, TOKEN_STORAGE_KEY } from './apiClient';

let socket: Socket | null = null;
const joinedTicketNumbers = new Set<string>();

function getSocketUrl(): string {
  const configuredSocketUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (typeof configuredSocketUrl === 'string' && configuredSocketUrl.trim()) {
    return configuredSocketUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  }

  const configuredApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (typeof configuredApiUrl === 'string' && configuredApiUrl.trim()) {
    return configuredApiUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  }

  if (/^https?:\/\//i.test(API_BASE)) {
    return API_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}

export function getSupportSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      auth: (callback) => callback({
        token: typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY),
      }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });
    socket.on('connect', () => {
      joinedTicketNumbers.forEach((ticketNumber) => socket?.emit('join:ticket', ticketNumber));
    });
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function joinSupportTicket(ticketNumber: string): () => void {
  const cleanTicketNumber = String(ticketNumber || '').trim();
  if (!cleanTicketNumber) return () => {};
  joinedTicketNumbers.add(cleanTicketNumber);
  const activeSocket = getSupportSocket();
  if (activeSocket.connected) activeSocket.emit('join:ticket', cleanTicketNumber);
  return () => {
    joinedTicketNumbers.delete(cleanTicketNumber);
    socket?.emit('leave:ticket', cleanTicketNumber);
  };
}

export function onSupportTicketMessage(callback: (payload: any) => void): () => void {
  const activeSocket = getSupportSocket();
  activeSocket.on('ticket:message', callback);
  return () => activeSocket.off('ticket:message', callback);
}

export function onSupportTicketStatus(callback: (payload: any) => void): () => void {
  const activeSocket = getSupportSocket();
  activeSocket.on('ticket:status_change', callback);
  return () => activeSocket.off('ticket:status_change', callback);
}