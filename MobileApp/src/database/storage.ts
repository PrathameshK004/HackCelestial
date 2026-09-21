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
  }
};
