import QRCode from 'qrcode';

export type UpiAppType = 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'generic';

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amount: number | string;
  currency?: string;
  note?: string;
  txnRef?: string;
  app?: UpiAppType;
  isNative?: boolean;
}

/**
 * Validates whether a string is a well-formed UPI ID (VPA)
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId) return false;
  // Standard NPCI UPI VPA format: username@bank
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId.trim());
}

/**
 * Builds compliant NPCI standard UPI deep link URLs.
 * 
 * CRITICAL SECURITY FIX (Flipkart/NPCI Standard):
 * - Never set 'mode=02' on web deep links. In NPCI specs, 'mode=02' specifies an
 *   offline camera-scanned QR code. Including 'mode=02' in browser intent URLs causes
 *   PhonePe and Google Pay to flag the transaction as an unsigned/spoofed QR attack and
 *   immediately abort with: "Payment failed due to security reasons".
 * - Omitting 'mode' or using clean standard intent allows PhonePe, GPay, Paytm, and BHIM
 *   to process the transfer through standard secure 2FA without fraud false-positives.
 */
export function buildUpiDeepLink(details: UpiPaymentDetails): string {
  const {
    upiId,
    payeeName,
    amount,
    currency = 'INR',
    note = 'Trip Shared Expense',
    app = 'generic',
    isNative = false
  } = details;

  const numAmount = Number(amount).toFixed(2);
  // Sanitize UPI ID (preserve valid VPA characters only)
  const cleanUpiId = (upiId || '').trim().replace(/[^a-zA-Z0-9.\-_@]/g, '');
  // Sanitize payee name: alphanumeric & space, max 30 chars (NPCI limit)
  const cleanName = (payeeName || 'Traveler')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  // Sanitize note: alphanumeric & space, max 30 chars
  const cleanNote = (note || 'Trip Expense')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);

  // CRITICAL: Do NOT include 'tr' (transaction reference) parameter.
  // PhonePe and Paytm treat 'tr' as a signal of an automated merchant payment,
  // which requires PSP registration. Without it, the payment is treated as standard P2P.

  const queryParams = new URLSearchParams();
  queryParams.set('pa', cleanUpiId);
  if (cleanName) queryParams.set('pn', cleanName);
  queryParams.set('am', numAmount);
  queryParams.set('cu', currency);
  if (cleanNote) queryParams.set('tn', cleanNote);

  const queryString = queryParams.toString();

  // Native mobile apps require clean standard upi://pay URIs (target package is handled by Intent)
  if (isNative) {
    return `upi://pay?${queryString}`;
  }

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  // Specific Package Intents for Android (bypasses device default UPI app handler)
  if (isAndroid) {
    switch (app) {
      case 'gpay':
        return `intent://pay?${queryString}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      case 'phonepe':
        return `intent://pay?${queryString}#Intent;scheme=upi;package=com.phonepe.app;end`;
      case 'paytm':
        return `intent://pay?${queryString}#Intent;scheme=upi;package=net.one97.paytm;end`;
      case 'bhim':
        return `intent://pay?${queryString}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
      case 'generic':
      default:
        return `upi://pay?${queryString}`;
    }
  }

  // Specific App Schemes for iOS
  if (isIOS) {
    switch (app) {
      case 'gpay':
        return `gpay://upi/pay?${queryString}`;
      case 'phonepe':
        return `phonepe://pay?${queryString}`;
      case 'paytm':
        return `paytmmp://pay?${queryString}`;
      case 'bhim':
        return `bhim://pay?${queryString}`;
      case 'generic':
      default:
        return `upi://pay?${queryString}`;
    }
  }

  // Fallback for desktop / standard browsers
  switch (app) {
    case 'gpay':
      return `intent://pay?${queryString}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    case 'phonepe':
      return `phonepe://pay?${queryString}`;
    case 'paytm':
      return `paytmmp://pay?${queryString}`;
    default:
      return `upi://pay?${queryString}`;
  }
}

/**
 * Direct App Launcher URLs (Flipkart Fallback Flow)
 * Opens the target UPI app directly to home screen for manual transfer if bank blocks deep links.
 */
export function getDirectAppLaunchUrl(app: UpiAppType): string {
  switch (app) {
    case 'phonepe':
      return 'phonepe://';
    case 'gpay':
      return 'https://pay.google.com/gp/v/home';
    case 'paytm':
      return 'paytm://';
    case 'bhim':
      return 'bhim://';
    default:
      return 'upi://pay';
  }
}

/**
 * Executes navigation to the UPI app
 */
export function launchUpiApp(url: string) {
  try {
    // On Android, window.location.href directly triggers package manager for intent:// URLs
    if (url.startsWith('intent://')) {
      window.location.href = url;
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.target = '_top';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
    }, 300);
  } catch (err) {
    console.warn('Error launching UPI app link, falling back to window.location:', err);
    window.location.href = url;
  }
}

/**
 * Generates an offline QR Code Data URL for any UPI payment payload.
 * When scanned by PhonePe / GPay camera, this is treated as a trusted camera scan
 * and is 100% immune to browser deep link restrictions.
 */
export async function generateUpiQrCode(details: UpiPaymentDetails): Promise<string> {
  const standardUrl = buildUpiDeepLink({ ...details, app: 'generic' });
  try {
    const dataUrl = await QRCode.toDataURL(standardUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#14241F',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate UPI QR code:', err);
    return '';
  }
}
