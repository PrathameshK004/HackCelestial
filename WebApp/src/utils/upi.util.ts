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
}

/**
 * Builds standard and app-specific UPI deep link URLs
 */
export function buildUpiDeepLink(details: UpiPaymentDetails): string {
  const {
    upiId,
    payeeName,
    amount,
    currency = 'INR',
    note = 'Trip Settlement',
    txnRef = 'TRIP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    app = 'generic'
  } = details;

  const numAmount = Number(amount).toFixed(2);
  const cleanUpiId = (upiId || '').trim();
  const cleanName = (payeeName || 'Traveler').trim();
  const cleanNote = (note || 'Trip Expense').trim().slice(0, 50);

  const queryParams = new URLSearchParams({
    pa: cleanUpiId,
    pn: cleanName,
    am: numAmount,
    cu: currency,
    tn: cleanNote,
    tr: txnRef,
  });

  const queryString = queryParams.toString();

  switch (app) {
    case 'phonepe':
      return `phonepe://pay?${queryString}`;
    case 'gpay':
      return `tez://upi/pay?${queryString}`;
    case 'paytm':
      return `paytmmp://pay?${queryString}`;
    case 'bhim':
      return `bhim://pay?${queryString}`;
    case 'generic':
    default:
      return `upi://pay?${queryString}`;
  }
}

/**
 * Executes navigation to the selected UPI app
 */
export function launchUpiApp(url: string) {
  try {
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
 * Generates an offline QR Code Data URL for any UPI payment payload
 */
export async function generateUpiQrCode(details: UpiPaymentDetails): Promise<string> {
  // QR codes are generated with standard upi://pay format accepted by all scanners (PhonePe, GPay, Paytm)
  const standardUrl = buildUpiDeepLink({ ...details, app: 'generic' });
  try {
    const dataUrl = await QRCode.toDataURL(standardUrl, {
      width: 280,
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
