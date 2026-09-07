import { Capacitor, registerPlugin } from '@capacitor/core';

export interface UpiPaymentResult {
  status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'SUBMITTED';
  utr?: string;
  rawResponse?: string;
  message?: string;
}

interface UpiPluginInterface {
  startPayment(options: { url: string; packageName?: string }): Promise<UpiPaymentResult>;
}

export const NativeUpi = registerPlugin<UpiPluginInterface>('UpiPayment');

/**
 * Returns true if running inside the Capacitor Native Mobile App (Android/iOS)
 */
export const isNativeMobileApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Resolves the Android package name for target UPI app
 */
export const getAppPackageName = (app: string): string | undefined => {
  switch (app) {
    case 'phonepe':
      return 'com.phonepe.app';
    case 'gpay':
      return 'com.google.android.apps.nbu.paisa.user';
    case 'paytm':
      return 'net.one97.paytm';
    case 'bhim':
      return 'in.org.npci.upiapp';
    default:
      return undefined;
  }
};
