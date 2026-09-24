import { Platform } from 'react-native';

export type UpiAppType = 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'generic';

export interface MobileUpiDetails {
  upiId: string;
  payeeName: string;
  amount: number | string;
  currency?: string;
  note?: string;
  txnRef?: string;
  app?: UpiAppType;
}

export interface ParsedUpiData {
  upiId: string;
  payeeName?: string;
  amount?: string;
  note?: string;
  raw: string;
}

/**
 * Validates whether a string matches NPCI standard UPI ID (VPA) format: username@bank
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId) return false;
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId.trim());
}

/**
 * Parses NPCI QR Code string (e.g. upi://pay?pa=...&pn=...&am=...&tn=...)
 * Or plain VPA text.
 */
export function parseUpiQrString(qrString: string): ParsedUpiData {
  const text = (qrString || '').trim();

  if (text.startsWith('upi://pay')) {
    try {
      const url = new URL(text);
      const pa = url.searchParams.get('pa') || '';
      const pn = url.searchParams.get('pn') || '';
      const am = url.searchParams.get('am') || '';
      const tn = url.searchParams.get('tn') || '';

      return {
        upiId: pa.trim(),
        payeeName: decodeURIComponent(pn).replace(/\+/g, ' ').trim(),
        amount: am ? parseFloat(am).toString() : '',
        note: decodeURIComponent(tn).replace(/\+/g, ' ').trim(),
        raw: text,
      };
    } catch {
      // Fallback regex extraction if URL parser fails on non-standard formatting
      const paMatch = text.match(/[?&]pa=([^&]+)/i);
      const pnMatch = text.match(/[?&]pn=([^&]+)/i);
      const amMatch = text.match(/[?&]am=([^&]+)/i);
      const tnMatch = text.match(/[?&]tn=([^&]+)/i);

      return {
        upiId: paMatch ? decodeURIComponent(paMatch[1]).trim() : '',
        payeeName: pnMatch ? decodeURIComponent(pnMatch[1]).replace(/\+/g, ' ').trim() : '',
        amount: amMatch ? decodeURIComponent(amMatch[1]).trim() : '',
        note: tnMatch ? decodeURIComponent(tnMatch[1]).replace(/\+/g, ' ').trim() : '',
        raw: text,
      };
    }
  }

  // Raw text may be a direct UPI ID
  return {
    upiId: text,
    raw: text,
  };
}

/**
 * Builds compliant NPCI standard UPI deep link URLs for Mobile Native Apps.
 * 
 * CRITICAL SECURITY & ANTI-FRAUD COMPLIANCE:
 * - NEVER include 'mode=02' on deep links! NPCI standard 'mode=02' is strictly reserved for
 *   hardware camera scans of physical QR codes. Passing 'mode=02' in intent links causes
 *   PhonePe and Google Pay security filters to reject the transaction immediately with
 *   "Payment failed due to security reasons".
 * - NEVER include unsigned merchant 'tr' (transaction reference) parameters without PSP keys,
 *   as PhonePe / Paytm interpret 'tr' as an automated merchant payment and block unverified P2P intents.
 * - Clean sanitization of payee name, amount, note, and VPA characters.
 */
export function buildMobileUpiUrl(details: MobileUpiDetails): string {
  const {
    upiId,
    payeeName,
    amount,
    currency = 'INR',
    note = 'Trip Expense',
    app = 'generic',
  } = details;

  const numAmount = Number(amount).toFixed(2);
  const cleanUpiId = (upiId || '').trim().replace(/[^a-zA-Z0-9.\-_@]/g, '');
  
  // Sanitize payee name: alphanumeric & space, max 30 chars (NPCI standard limit)
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

  const queryParams = [
    `pa=${encodeURIComponent(cleanUpiId)}`,
    cleanName ? `pn=${encodeURIComponent(cleanName)}` : '',
    `am=${encodeURIComponent(numAmount)}`,
    `cu=${encodeURIComponent(currency)}`,
    cleanNote ? `tn=${encodeURIComponent(cleanNote)}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const standardUpi = `upi://pay?${queryParams}`;

  if (Platform.OS === 'android') {
    // CRITICAL: On modern Android (API 30+), PhonePe, Google Pay, and Paytm strictly
    // require standard "upi://pay" format. Using deprecated "phonepe://pay" or "paytmmp://pay"
    // triggers security exceptions or fails package routing.
    // The target app is routed directly via Android package intent.
    return standardUpi;
  }

  if (Platform.OS === 'ios') {
    // iOS App specific custom schemes (registered in Info.plist)
    switch (app) {
      case 'phonepe':
        return `phonepe://pay?${queryParams}`;
      case 'gpay':
        return `gpay://upi/pay?${queryParams}`;
      case 'paytm':
        return `paytmmp://pay?${queryParams}`;
      case 'bhim':
        return `bhim://pay?${queryParams}`;
      case 'generic':
      default:
        return standardUpi;
    }
  }

  return standardUpi;
}

/**
 * Maps app type to standard Android package ID for targeted startActivityForResult
 */
export function getUpiPackageName(app: UpiAppType): string | null {
  if (Platform.OS !== 'android') return null;
  switch (app) {
    case 'phonepe':
      return 'com.phonepe.app';
    case 'gpay':
      return 'com.google.android.apps.nfc.phone';
    case 'paytm':
      return 'net.one97.paytm';
    case 'bhim':
      return 'in.org.npci.upiapp';
    case 'generic':
    default:
      return null;
  }
}

/**
 * Builds an authentic scanned QR intent URL:
 * - CRITICAL: Always strips 'mode=02', 'mc=0000', 'purpose=00', and 'orgid'.
 *   Personal QR codes generated on another phone (PhonePe/GPay) include 'mc=0000' and 'mode=02'.
 *   When passed via a 3rd-party app Intent, PhonePe detects an external P2P intent and blocks
 *   it with "Payment failed due to security reasons".
 * - Stripping these non-essential metadata flags turns it into a clean, compliant VPA intent.
 */
export function buildScannedVendorUpiUrl(rawQr: string, amount?: number | string): string {
  let url = (rawQr || '').trim();
  if (!url.startsWith('upi://pay')) {
    return url;
  }

  // 1. Strictly remove flags that cause PhonePe security blocks on personal QRs
  url = url
    .replace(/([?&])mode=[^&]*(&|$)/gi, '$1')
    .replace(/([?&])mc=0000(&|$)/gi, '$1')
    .replace(/([?&])purpose=[^&]*(&|$)/gi, '$1')
    .replace(/([?&])orgid=[^&]*(&|$)/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/&&+/, '&')
    .replace(/[?&]$/, '');

  // 2. Set or update amount if specified
  if (amount && Number(amount) > 0) {
    const numAmount = Number(amount).toFixed(2);
    if (/([?&])am=[^&]*/i.test(url)) {
      url = url.replace(/([?&])am=[^&]*/i, `$1am=${encodeURIComponent(numAmount)}`);
    } else {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}am=${encodeURIComponent(numAmount)}`;
    }
  }

  // 3. Ensure currency is set to INR
  if (!/([?&])cu=[^&]*/i.test(url)) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}cu=INR`;
  }

  return url.replace(/[?&]$/, '').replace(/\?&/, '?').replace(/&&+/, '&');
}

/**
 * Returns user-friendly app name and color
 */
export const UPI_APP_CONFIG: Record<
  UpiAppType,
  { name: string; subtitle: string; color: string; bg: string; badge: string }
> = {
  phonepe: {
    name: 'PhonePe',
    subtitle: '1-Tap UPI Intent',
    color: '#5F259F',
    bg: '#F5EFFB',
    badge: 'पे',
  },
  gpay: {
    name: 'Google Pay',
    subtitle: '1-Tap UPI Intent',
    color: '#1A73E8',
    bg: '#EDF5FF',
    badge: 'GPay',
  },
  paytm: {
    name: 'Paytm UPI',
    subtitle: '1-Tap UPI Intent',
    color: '#002E6E',
    bg: '#EBF8FE',
    badge: 'Paytm',
  },
  bhim: {
    name: 'BHIM UPI',
    subtitle: 'Direct NPCI',
    color: '#00838F',
    bg: '#E0F7FA',
    badge: 'BHIM',
  },
  generic: {
    name: 'Any UPI App',
    subtitle: 'Choose installed app',
    color: '#243E36',
    bg: '#EBF4F0',
    badge: 'UPI',
  },
};
