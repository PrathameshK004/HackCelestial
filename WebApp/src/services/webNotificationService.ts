import { apiRequest } from './apiClient';

export interface WebNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

/**
 * Request Web Push Permission and Register FCM Token with Backend
 */
export async function requestWebPushPermission(userId?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[Web Push] Browser does not support desktop notifications');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Web Push] User denied notification permission');
      return null;
    }

    // Try to register web push token with backend
    const mockToken = `web_token_${userId || 'guest'}_${Date.now()}`;
    try {
      await apiRequest('/user-push-tokens', {
        method: 'POST',
        body: JSON.stringify({ userId, token: mockToken, deviceType: 'web' })
      });
    } catch (err: any) {
      console.warn('[Web Push] Failed to register token with backend:', err?.message);
    }

    return mockToken;
  } catch (err: any) {
    console.error('[Web Push] Permission request error:', err?.message);
    return null;
  }
}

/**
 * Fetch persistent in-app notifications stored in backend DB for current user
 */
export async function fetchUserNotifications(): Promise<WebNotificationItem[]> {
  try {
    const res = await apiRequest<{ message: string; data: WebNotificationItem[] }>('/notifications', {
      method: 'GET'
    });
    return res.data || [];
  } catch (err: any) {
    console.warn('[Notifications] Failed to fetch inbox notifications:', err?.message);
    return [];
  }
}

/**
 * Mark in-app notification as read
 */
export async function markNotificationAsRead(notificationId?: string, markAll = false): Promise<boolean> {
  try {
    await apiRequest('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId, markAll })
    });
    return true;
  } catch (err: any) {
    console.warn('[Notifications] Failed to mark read:', err?.message);
    return false;
  }
}

/**
 * Delete a specific in-app notification
 */
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await apiRequest(`/notifications/${id}`, {
      method: 'DELETE'
    });
    return true;
  } catch (err: any) {
    console.warn('[Notifications] Failed to delete notification:', err?.message);
    return false;
  }
}

/**
 * Clear all in-app notifications
 */
export async function clearAllNotifications(): Promise<boolean> {
  try {
    await apiRequest('/notifications/clear-all', {
      method: 'DELETE'
    });
    return true;
  } catch (err: any) {
    console.warn('[Notifications] Failed to clear notifications:', err?.message);
    return false;
  }
}
