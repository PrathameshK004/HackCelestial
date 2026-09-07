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
    note = 'Trip Expense',
    app = 'generic'
  } = details;

  const numAmount = Number(amount).toFixed(2);
  const cleanUpiId = (upiId || '').trim();
  const cleanName = (payeeName || 'Traveler').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 30);
  const cleanNote = (note || 'Trip Expense').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 30);

  const queryParams = new URLSearchParams();
  queryParams.set('pa', cleanUpiId);
  if (cleanName) queryParams.set('pn', cleanName);
  queryParams.set('am', numAmount);
  queryParams.set('cu', currency);
  if (cleanNote) queryParams.set('tn', cleanNote);
  queryParams.set('mode', '02'); // NPCI standard P2P compliant transfer

  const queryString = queryParams.toString();

  switch (app) {
    case 'phonepe':
      // Universal upi://pay intent prevents PhonePe anti-fraud decline on non-merchant deep links
      return `upi://pay?${queryString}`;
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
