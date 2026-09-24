/**
 * Production-Grade Socket.io Real-Time Client for MobileApp
 * Manages WebSocket connection, user room channels, and real-time notification events
 */

import { io, Socket } from 'socket.io-client';
import { SERVER_BASE, FALLBACK_SERVER_BASE } from '../api/apiClient';
import { storage } from '../database/storage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private currentServerBase: string = SERVER_BASE;
  private hasTriedFallback: boolean = false;
  private lastConnectErrorLogged: number = 0;

  /**
   * Connect to Socket.io Server using active user token
   */
  async connect(): Promise<Socket | null> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return null;
    }

    this.isConnecting = true;

    try {
      const token = await storage.getAuthToken();
      this.currentServerBase = SERVER_BASE;
      this.hasTriedFallback = false;

      this.initSocket(this.currentServerBase, token);

      return this.socket;
    } catch (err: any) {
      console.warn('[Socket.io] Exception during connect:', err?.message);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  private initSocket(serverUrl: string, token: string | null) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log(`[Socket.io] Real-time WebSocket connected successfully to ${serverUrl}:`, this.socket?.id);
      this.hasTriedFallback = false;
    });

    this.socket.on('connect_error', (err) => {
      const now = Date.now();
      // Throttle logging to avoid continuous console spam (log at most once per 10s)
      if (now - this.lastConnectErrorLogged > 10000) {
        console.warn(`[Socket.io] Connection error (${serverUrl}):`, err?.message || 'websocket error');
        this.lastConnectErrorLogged = now;
      }

      // Attempt fallback server if primary fails and fallback server is different
      if (!this.hasTriedFallback && SERVER_BASE !== FALLBACK_SERVER_BASE) {
        this.hasTriedFallback = true;
        console.log(`[Socket.io] Switching to fallback server: ${FALLBACK_SERVER_BASE}`);
        this.currentServerBase = FALLBACK_SERVER_BASE;
        setTimeout(() => {
          this.initSocket(FALLBACK_SERVER_BASE, token);
        }, 1000);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Socket disconnected:', reason);
    });

    // Forward registered listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.off(event, cb);
        this.socket?.on(event, cb);
      });
    });
  }

  /**
   * Disconnect Socket.io connection on logout
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[Socket.io] Socket disconnected on cleanup');
    }
  }

  /**
   * Listen for real-time in-app notification event
   */
  onNotification(callback: (notification: any) => void): () => void {
    return this.on('notification:new', callback);
  }

  /**
   * Listen for general real-time socket events
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const callbacks = this.listeners.get(event)!;
    callbacks.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return cleanup function
    return () => {
      const current = this.listeners.get(event) || [];
      this.listeners.set(event, current.filter((cb) => cb !== callback));
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  /**
   * Join a specific trip workspace room
   */
  joinGroup(groupId: string) {
    if (this.socket && groupId) {
      this.socket.emit('join:group', groupId);
    }
  }

  /**
   * Leave a trip workspace room
   */
  leaveGroup(groupId: string) {
    if (this.socket && groupId) {
      this.socket.emit('leave:group', groupId);
    }
  }
}

export const socketService = new SocketService();
