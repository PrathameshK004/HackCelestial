import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { apiRequest } from '../api/apiClient';
import { storage } from '../database/storage';

/**
 * In Expo SDK 53+, importing `expo-notifications` at top level automatically
 * loads `DevicePushTokenAutoRegistration.fx` which immediately throws an error
 * inside Expo Go on Android.
 *
 * We lazily resolve the module ONLY when running in a standalone / development build,
 * or on non-Android platforms, completely preventing the Expo Go red screen crash.
 */
let notificationsModule: typeof import('expo-notifications') | null = null;
let isHandlerSet = false;

function getNotifications(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return null;
  }

  if (!notificationsModule) {
    try {
      notificationsModule = require('expo-notifications');
      if (notificationsModule && !isHandlerSet) {
        notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        isHandlerSet = true;
      }
    } catch (e: any) {
      console.warn('[Push] expo-notifications not loaded:', e?.message);
      return null;
    }
  }

  return notificationsModule;
}

export const notificationService = {
  /**
   * Configure Android notification channels
   */
  async initNotificationChannels(): Promise<void> {
    const Notifications = getNotifications();
    if (!Notifications || Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('expenses', {
        name: 'Expense Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('invites', {
        name: 'Trip Invitations',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#3B82F6',
        sound: 'default',
      });
    } catch (err: any) {
      console.warn('[Push] Notification channel setup error:', err?.message);
    }
  },

  /**
   * Request push notification permission, retrieve device FCM token,
   * and register it with the backend.
   */
  async registerForPushNotifications(): Promise<string | null> {
    // If in Expo Go on Android, skip remote push registration cleanly
    if (Platform.OS === 'android' && isRunningInExpoGo()) {
      console.log(
        '[Push] Running in Expo Go: remote FCM notifications require a Development Build (npx expo run:android). Push registration safely bypassed.'
      );
      return null;
    }

    const Notifications = getNotifications();
    if (!Notifications) {
      return null;
    }

    try {
      await this.initNotificationChannels();

      // Push notifications only deliver to physical hardware devices
      if (!Device.isDevice) {
        console.log('[Push] Running on simulator/emulator - physical device required for remote FCM push');
        return null;
      }

      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Push] Notification permissions not granted by user');
        return null;
      }

      // Obtain native device token (FCM on Android, APNs on iOS)
      let token: string | null = null;
      try {
        const deviceTokenRes = await Notifications.getDevicePushTokenAsync();
        token = deviceTokenRes.data;
      } catch (err: any) {
        console.warn('[Push] Direct device push token failed, attempting fallback:', err?.message);
        try {
          const expoTokenRes = await Notifications.getExpoPushTokenAsync();
          token = expoTokenRes.data;
        } catch (fallbackErr: any) {
          console.warn('[Push] Fallback token retrieval failed:', fallbackErr?.message);
        }
      }

      if (!token) {
        console.warn('[Push] Could not obtain push token from device');
        return null;
      }

      console.log('[Push] Device Push Token obtained successfully');

      // Save token locally
      await storage.setPushToken(token);

      // Register device token with backend API
      try {
        await apiRequest('/users/push-token', {
          method: 'POST',
          body: JSON.stringify({
            token,
            deviceType: Platform.OS,
          }),
        });
        console.log('[Push] Token successfully registered with backend server');
      } catch (apiErr: any) {
        console.warn('[Push] Failed to register token with backend (will retry on next session):', apiErr?.message);
      }

      return token;
    } catch (error: any) {
      console.warn('[Push] Error in registerForPushNotifications:', error?.message);
      return null;
    }
  },

  /**
   * Unregister device push token with backend on logout
   */
  async unregisterPushNotifications(): Promise<void> {
    try {
      const token = await storage.getPushToken();
      if (token) {
        try {
          await apiRequest('/users/push-token', {
            method: 'DELETE',
            body: JSON.stringify({ token }),
          });
        } catch (err: any) {
          console.warn('[Push] Failed to unregister token on backend:', err?.message);
        }
        await storage.removePushToken();
      }
    } catch (e: any) {
      console.warn('[Push] Error unregistering push notifications:', e?.message);
    }
  },

  /**
   * Attach foreground and tap listeners for push notifications
   */
  addNotificationListeners(
    onReceived?: (notification: any) => void,
    onResponse?: (response: any) => void
  ) {
    const Notifications = getNotifications();
    if (!Notifications) {
      return () => {};
    }

    try {
      const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Push] Notification received in foreground:', notification.request.content.title);
        if (onReceived) {
          onReceived(notification);
        }
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[Push] Notification tapped by user:', response.notification.request.content.title);
        if (onResponse) {
          onResponse(response);
        }
      });

      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (e: any) {
      console.warn('[Push] Error attaching notification listeners:', e?.message);
      return () => {};
    }
  },
};
