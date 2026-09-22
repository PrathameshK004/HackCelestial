import { apiRequest } from './apiClient';

export interface InAppNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export class NotificationService {
  async getUserNotifications(): Promise<{ message: string; data: InAppNotificationItem[] }> {
    try {
      return await apiRequest<{ message: string; data: InAppNotificationItem[] }>('/notifications', {
        method: 'GET',
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        return { message: 'Unauthenticated', data: [] };
      }
      throw err;
    }
  }

  async markAsRead(notificationId?: string, markAll = false): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId, markAll }),
    });
  }

  async deleteNotification(id: string): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async clearAllNotifications(): Promise<{ message: string; data: any }> {
    return apiRequest<{ message: string; data: any }>('/notifications/clear-all', {
      method: 'DELETE',
    });
  }
}

export const notificationService = new NotificationService();
