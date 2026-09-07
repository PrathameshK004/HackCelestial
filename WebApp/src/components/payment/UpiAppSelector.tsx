import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  UpiAppType,
  UpiPaymentDetails,
  buildUpiDeepLink,
  launchUpiApp,
  generateUpiQrCode
} from '../../utils/upi.util';

interface UpiAppSelectorProps {
  details: UpiPaymentDetails;
  onPaymentInitiated?: (app: UpiAppType, deepLink: string) => void;
  onPaymentCompleted?: (reference: string, app: UpiAppType) => void;
  currencySymbol?: string;
}

export const UpiAppSelector: React.FC<UpiAppSelectorProps> = ({
  details,
  onPaymentInitiated,
  onPaymentCompleted,
  currencySymbol = '₹'
}) => {
  const [selectedApp, setSelectedApp] = useState<UpiAppType | 'qr'>('phonepe');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [enteredUtr, setEnteredUtr] = useState('');
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [launchedAppName, setLaunchedAppName] = useState('');

  useEffect(() => {
    generateUpiQrCode(details).then((url) => {
      if (url) setQrCodeUrl(url);
    });
  }, [details.upiId, details.amount, details.payeeName, details.txnRef]);

  const handleAppClick = (app: UpiAppType) => {
    setSelectedApp(app);
    const deepLink = buildUpiDeepLink({ ...details, app });
    const appNames: Record<UpiAppType, string> = {
      phonepe: 'PhonePe',
      gpay: 'Google Pay',
      paytm: 'Paytm',
      bhim: 'BHIM UPI',
      generic: 'UPI Chooser'
    };

    setLaunchedAppName(appNames[app]);
    setHasLaunchedApp(true);
    launchUpiApp(deepLink);

    if (onPaymentInitiated) {
      onPaymentInitiated(app, deepLink);
    }
  };

  const handleCopyUpiId = () => {
    if (details.upiId) {
      navigator.clipboard.writeText(details.upiId);
      setIsCopiedUpi(true);
      setTimeout(() => setIsCopiedUpi(false), 2000);
    }
  };

  const handleConfirmDone = () => {
    const finalRef = enteredUtr.trim() || details.txnRef || ('UPI-' + Date.now().toString().slice(-8));
    if (onPaymentCompleted) {
      onPaymentCompleted(finalRef, selectedApp === 'qr' ? 'generic' : selectedApp);
    }
  };

  return (
    <div className="upi-gateway-container" style={{ width: '100%' }}>
      {/* Amount Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(36, 62, 54, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(36, 62, 54, 0.14)',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Amount to Pay
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '2px' }}>
            {currencySymbol}{Number(details.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recipient
          </span>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#243E36', marginTop: '2px' }}>
            {details.payeeName}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748B', cursor: 'pointer' }} onClick={handleCopyUpiId}>
            <span>{details.upiId}</span>
            {isCopiedUpi ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
          </div>
        </div>
      </div>

      {/* App Selector Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Select Preferred UPI App
        </span>
        <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <ShieldCheck size={12} /> Instant NPCI Direct
        </span>
      </div>

      {/* UPI App Icons Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '14px'
        }}
      >
        {/* 1. PhonePe */}
        <button
          type="button"
          onClick={() => handleAppClick('phonepe')}
          style={{
            padding: '10px 6px',
            borderRadius: '14px',
            border: selectedApp === 'phonepe' ? '2px solid #5f259f' : '1px solid var(--border-light)',
            background: selectedApp === 'phonepe' ? 'rgba(95, 37, 159, 0.08)' : 'var(--bg-surface)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Open in PhonePe app"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#5f259f',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 4px 10px rgba(95, 37, 159, 0.3)'
            }}
          >
            पे
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E293B' }}>PhonePe</span>
        </button>

        {/* 2. Google Pay (GPay) */}
        <button
          type="button"
          onClick={() => handleAppClick('gpay')}
          style={{
            padding: '10px 6px',
            borderRadius: '14px',
            border: selectedApp === 'gpay' ? '2px solid #1A73E8' : '1px solid var(--border-light)',
            background: selectedApp === 'gpay' ? 'rgba(26, 115, 232, 0.08)' : 'var(--bg-surface)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Open in Google Pay app"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.06)'
            }}
          >
            <span style={{ color: '#4285F4' }}>G</span>
            <span style={{ color: '#EA4335' }}>P</span>
            <span style={{ color: '#FBBC05' }}>a</span>
            <span style={{ color: '#34A853' }}>y</span>
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E293B' }}>GPay</span>
        </button>

        {/* 3. Paytm */}
        <button
          type="button"
          onClick={() => handleAppClick('paytm')}
          style={{
            padding: '10px 6px',
            borderRadius: '14px',
            border: selectedApp === 'paytm' ? '2px solid #00B9F5' : '1px solid var(--border-light)',
            background: selectedApp === 'paytm' ? 'rgba(0, 185, 245, 0.08)' : 'var(--bg-surface)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Open in Paytm app"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#002E6E',
              color: '#00B9F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.7rem',
              boxShadow: '0 4px 10px rgba(0, 46, 110, 0.25)'
            }}
          >
            Paytm
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E293B' }}>Paytm</span>
        </button>

        {/* 4. Any UPI App / Chooser */}
        <button
          type="button"
          onClick={() => handleAppClick('generic')}
          style={{
            padding: '10px 6px',
            borderRadius: '14px',
            border: selectedApp === 'generic' ? '2px solid #005D52' : '1px solid var(--border-light)',
            background: selectedApp === 'generic' ? 'rgba(0, 93, 82, 0.08)' : 'var(--bg-surface)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Open native device UPI app picker"
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#005D52',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem',
              boxShadow: '0 4px 10px rgba(0, 93, 82, 0.25)'
            }}
          >
            UPI
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1E293B' }}>Other UPI</span>
        </button>
      </div>

      {/* QR Code Toggle Button */}
      <div style={{ marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setSelectedApp(selectedApp === 'qr' ? 'phonepe' : 'qr')}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px dashed var(--border-light)',
            background: selectedApp === 'qr' ? 'rgba(36, 62, 54, 0.06)' : 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <QrCode size={15} color="#243E36" />
          <span>{selectedApp === 'qr' ? 'Hide QR Code' : 'Scan QR with PhonePe / GPay on Phone'}</span>
        </button>
      </div>

      {/* QR Code Container (if selected) */}
      {selectedApp === 'qr' && (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-light)',
            marginBottom: '16px'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Open PhonePe, GPay, or Paytm and scan:
          </span>
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="UPI Payment QR Code"
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                margin: '0 auto',
                display: 'block'
              }}
            />
          ) : (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              Generating QR Code...
            </div>
          )}
          <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '6px', display: 'block' }}>
            UPI ID: {details.upiId}
          </span>
        </div>
      )}

      {/* Confirmation & App Trigger State */}
      {hasLaunchedApp ? (
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '14px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={16} color="#10B981" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
              Opening {launchedAppName}...
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 10px', lineHeight: 1.4 }}>
            Please approve the payment of <strong>{currencySymbol}{details.amount}</strong> in your {launchedAppName} app. Once completed, confirm below to update the expedition ledger.
          </p>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Bank UTR / Transaction Ref (Optional)
            </label>
            <input
              type="text"
              placeholder={details.txnRef || 'e.g. 428190382910'}
              value={enteredUtr}
              onChange={(e) => setEnteredUtr(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmDone}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <CheckCircle2 size={15} />
            <span>I have Paid {currencySymbol}{details.amount}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleAppClick('phonepe')}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '9999px',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Smartphone size={16} />
          <span>Pay via PhonePe / GPay</span>
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
};
