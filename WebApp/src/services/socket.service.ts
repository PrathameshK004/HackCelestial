import { io, Socket } from 'socket.io-client';
import { API_BASE } from './apiClient';

let socket: Socket | null = null;
const joinedTicketRooms = new Set<string>();

export function getSocketUrl(): string {
  // 1. If custom environment variable is set
  const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Local development fallback to Backend port 4000
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return `http://${hostname}:4000`;
    }
  }

  // 3. Match API_BASE origin
  try {
    const url = new URL(API_BASE);
    return url.origin;
  } catch {
    return 'https://triptual-api.onrender.com';
  }
}

/**
 * Initialize or retrieve singleton Socket.io client instance
 */
export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = getSocketUrl();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('triptual_auth_token') : null;
    const userRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('triptual_auth_user') : null;
    let userId = null;
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        userId = u.id || u.key || u.userId;
      } catch (_) {}
    }

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token, userId, role: 'USER' },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.io] Connected to server successfully (ID:', socket?.id, ')');
      if (userId) {
        socket?.emit('join:user', userId);
      }
      joinedTicketRooms.forEach((ticketNumber) => socket?.emit('join:ticket', ticketNumber));
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ [Socket.io] Disconnected:', reason);
    });
  }

  return socket;
}

/**
 * Join dedicated support ticket room
 */
export function joinTicketRoom(ticketNumber: string) {
  const s = getSocket();
  if (ticketNumber) {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.add(clean);
    s.emit('join:ticket', clean);
    console.log('⚡ [Socket.io] Joined room for ticket:', clean);
  }
}

export function joinTicketRooms(ticketNumbers: string[]) {
  const s = getSocket();
  ticketNumbers.filter(Boolean).forEach((ticketNumber) => {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.add(clean);
    s.emit('join:ticket', clean);
  });
}

/**
 * Leave support ticket room
 */
export function leaveTicketRoom(ticketNumber: string) {
  const s = getSocket();
  if (ticketNumber) {
    const clean = String(ticketNumber).trim();
    joinedTicketRooms.delete(clean);
    s.emit('leave:ticket', clean);
    console.log('⚡ [Socket.io] Left room for ticket:', clean);
  }
}

/**
 * Subscribe to real-time incoming messages for current ticket
 */
export function subscribeTicketMessages(callback: (messageData: any) => void) {
  const s = getSocket();
  const handler = (data: any) => {
    callback(data);
  };
  s.on('ticket:message', handler);
  return () => {
    s.off('ticket:message', handler);
  };
}

/**
 * Subscribe to real-time ticket status updates
 */
export function subscribeTicketStatus(callback: (statusData: any) => void) {
  const s = getSocket();
  const handler = (data: any) => {
    callback(data);
  };
  s.on('ticket:status_change', handler);
  return () => {
    s.off('ticket:status_change', handler);
  };
}
