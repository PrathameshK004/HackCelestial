/**
 * Key-Value Storage using AsyncStorage
 * STRICTLY restricted to small key-value items (auth tokens, refresh tokens, active user session)
 * Relational trip/ledger data is NOT stored here; it is stored in SQLite.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

export const TOKEN_STORAGE_KEY = 'triptual_auth_token';
export const REFRESH_TOKEN_KEY = 'triptual_refresh_token';
export const USER_STORAGE_KEY = 'triptual_auth_user';
export const OFFLINE_MODE_PREF_KEY = 'triptual_offline_pref';
export const PUSH_TOKEN_KEY = 'triptual_fcm_push_token';
export const READ_NOTIFICATIONS_KEY = 'triptual_read_notifications';

export const storage = {
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.warn('Failed to save auth token:', e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save refresh token:', e);
    }
  },

  async getAuthUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setAuthUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save auth user:', e);
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, REFRESH_TOKEN_KEY, USER_STORAGE_KEY]);
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  },

  async getPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setPushToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save push token:', e);
    }
  },

  async removePushToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to remove push token:', e);
    }
  },

  async getReadNotificationIds(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async setReadNotificationIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save read notification IDs:', e);
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      if (!id) return;
      const existing = await this.getReadNotificationIds();
      if (!existing.includes(id)) {
        existing.push(id);
        await this.setReadNotificationIds(existing);
      }
    } catch (e) {
      console.warn('Failed to mark notification read in storage:', e);
    }
  },

  async markAllNotificationsRead(ids: string[]): Promise<void> {
    try {
      const existing = await this.getReadNotificationIds();
      const combined = Array.from(new Set([...existing, ...ids]));
      await this.setReadNotificationIds(combined);
    } catch (e) {
      console.warn('Failed to mark all notifications read in storage:', e);
    }
  },

  async clearReadNotificationIds(): Promise<void> {
    try {
      await AsyncStorage.removeItem(READ_NOTIFICATIONS_KEY);
    } catch (e) {
      console.warn('Failed to clear read notification IDs:', e);
    }
  }
};
