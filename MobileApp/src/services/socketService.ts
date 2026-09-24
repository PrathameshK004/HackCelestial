/**
 * Production-Grade Socket.io Real-Time Client for MobileApp
 * Manages WebSocket connection, user room channels, AppState foreground reconnection,
 * and real-time notification events.
 */

import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { SERVER_BASE, FALLBACK_SERVER_BASE } from '../api/apiClient';
import { storage } from '../database/storage';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private currentServerBase: string = SERVER_BASE;
  private hasTriedFallback: boolean = false;
  private lastConnectErrorLogged: number = 0;
  private activeToken: string | null = null;
  private activeUserId: string | null = null;
  private appStateSubscription: any = null;

  constructor() {
    // Reconnect socket when mobile app returns to foreground from background/lock
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      if (!this.socket || !this.socket.connected) {
        console.log('📱 [Mobile Socket] App resumed to foreground -> Reconnecting Socket.IO');
        this.connect().catch(() => {});
      }
    }
  };

  /**
   * Check if WebSocket is currently connected
   */
  get connected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  /**
   * Connect to Socket.io Server using active user token and userId
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
      const [token, user] = await Promise.all([
        storage.getAuthToken(),
        storage.getAuthUser(),
      ]);

      this.activeToken = token;
      this.activeUserId = user?.id || (user as any)?.userId || null;
      this.currentServerBase = SERVER_BASE;
      this.hasTriedFallback = false;

      this.initSocket(this.currentServerBase, this.activeToken, this.activeUserId);

      return this.socket;
    } catch (err: any) {
      console.warn('🔴 [Socket.io] Exception during connect:', err?.message);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Re-sync socket authentication credentials on login or profile update
   */
  async syncSession(token?: string | null, userId?: string | null) {
    if (token) this.activeToken = token;
    if (userId) this.activeUserId = userId;

    if (!this.activeToken || !this.activeUserId) {
      const [storedToken, storedUser] = await Promise.all([
        storage.getAuthToken(),
        storage.getAuthUser(),
      ]);
      if (storedToken) this.activeToken = storedToken;
      if (storedUser?.id) this.activeUserId = storedUser.id;
    }

    if (this.socket && this.socket.connected && this.activeUserId) {
      this.socket.emit('join:user', this.activeUserId);
      return;
    }

    // Otherwise re-initialize connection
    this.initSocket(this.currentServerBase, this.activeToken, this.activeUserId);
  }

  private initSocket(serverUrl: string, token: string | null, userId: string | null) {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    // Configure resilient Socket.io connection for React Native
    this.socket = io(serverUrl, {
      auth: {
        token: token || undefined,
        userId: userId || undefined,
      },
      transports: ['websocket', 'polling'], // Prefer websocket transport in React Native
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log(`🟢 [Socket.io] Connected successfully to ${serverUrl}:`, this.socket?.id);
      this.hasTriedFallback = false;

      // Immediately ensure user is joined to their room
      if (this.activeUserId) {
        this.socket?.emit('join:user', this.activeUserId);
      }
    });

    this.socket.on('connect_error', (err) => {
      const now = Date.now();
      // Throttle logging to avoid console spam
      if (now - this.lastConnectErrorLogged > 8000) {
        console.warn(`🔴 [Socket.io] Connection error (${serverUrl}):`, err?.message || 'websocket connection failed');
        this.lastConnectErrorLogged = now;
      }

      // Attempt fallback server if primary fails and fallback server is different
      if (!this.hasTriedFallback && SERVER_BASE !== FALLBACK_SERVER_BASE) {
        this.hasTriedFallback = true;
        console.log(`🔄 [Socket.io] Switching to fallback server: ${FALLBACK_SERVER_BASE}`);
        this.currentServerBase = FALLBACK_SERVER_BASE;
        setTimeout(() => {
          this.initSocket(FALLBACK_SERVER_BASE, token, userId);
        }, 1000);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ [Socket.io] Socket disconnected:', reason);
    });

    // Re-attach all registered event listeners to the new socket instance
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
      console.log('🔌 [Socket.io] Socket disconnected on cleanup');
    }
    this.activeToken = null;
    this.activeUserId = null;
  }

  /**
   * Listen for real-time in-app notification event with deduplication
   * Supports both 'notification:new' and 'notification' events
   */
  onNotification(callback: (notification: any) => void): () => void {
    const seenEventKeys = new Set<string>();

    const safeCallback = (data: any) => {
      if (!data) return;
      // Deduplicate rapid dual-emits by ID or title+timestamp
      const eventKey = String(
        data.id || `${data.title || ''}-${data.createdAt || data.timestamp || Date.now()}`
      );

      if (seenEventKeys.has(eventKey)) {
        return;
      }

      seenEventKeys.add(eventKey);
      if (seenEventKeys.size > 100) {
        const first = seenEventKeys.values().next().value;
        if (first) seenEventKeys.delete(first);
      }

      callback(data);
    };

    // Subscribe to all standard, admin, and broadcast event channels
    const channels = [
      'notification:new',
      'notification',
      'broadcast',
      'broadcast_notification',
      'admin:broadcast',
      'admin:notification',
      'notification:broadcast',
      'system:alert',
    ];

    const unsubs = channels.map((channel) => this.on(channel, safeCallback));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
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
