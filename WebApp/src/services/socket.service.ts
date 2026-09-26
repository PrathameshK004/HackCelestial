import { io, Socket } from 'socket.io-client';
import { API_BASE } from './apiClient';

let socket: Socket | null = null;
const joinedTicketRooms = new Set<string>();

function getStoredUserId() {
  const userRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('triptual_auth_user') : null;
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw);
    return user.id || user.key || user.userId || null;
  } catch {
    return null;
  }
}

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
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: (callback) => callback({
        token: typeof localStorage !== 'undefined' ? localStorage.getItem('triptual_auth_token') : null,
        userId: getStoredUserId(),
        role: 'USER',
      }),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.io] Connected to server successfully (ID:', socket?.id, ')');
      const userId = getStoredUserId();
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
    s.emit('join:ticket', clean, (result: { success: boolean; error?: string }) => {
      if (!result?.success) console.warn('[Socket.io] Could not join ticket room:', result?.error || clean);
    });
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

export function sendSocketTicketMessage(ticketNumber: string, messageData: any) {
  const s = getSocket();
  if (!ticketNumber || !messageData?.id) return;
  s.emit('ticket:send_message', {
    ticketNumber: String(ticketNumber).trim(),
    ...messageData,
    senderRole: messageData.senderRole || 'USER'
  });
}

/**
 * Subscribe to real-time incoming messages for current ticket
 */
export function subscribeTicketMessages(callback: (messageData: any) => void) {
  const s = getSocket();
  const seenMessageIds = new Set<string>();
  const handler = (data: any) => {
    const message = data?.message && typeof data.message === 'object' ? data.message : data;
    if (message?.id) {
      if (seenMessageIds.has(String(message.id))) return;
      seenMessageIds.add(String(message.id));
      if (seenMessageIds.size > 2000) seenMessageIds.clear();
    }
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

export function subscribeTicketCreated(callback: (ticketData: any) => void) {
  const s = getSocket();
  const handler = (data: any) => callback(data);
  s.on('ticket:created', handler);
  return () => {
    s.off('ticket:created', handler);
  };
}
