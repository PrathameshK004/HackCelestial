import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  QrCode,
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  ExternalLink
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { groupService } from '../../services/group.service';
import {
  buildUpiDeepLink,
  launchUpiApp,
  generateUpiQrCode,
  getDirectAppLaunchUrl,
  UpiAppType
} from '../../utils/upi.util';
import {
  NativeUpi,
  isNativeMobileApp,
  getAppPackageName
} from '../../utils/nativeUpi';

interface VendorUpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGroups: any[];
  onPaymentSuccess: () => Promise<void>;
  autoStartCamera?: boolean;
}

type ModalStep = 'vendor' | 'details' | 'select_app' | 'verifying' | 'success';

export const VendorUpiPaymentModal: React.FC<VendorUpiPaymentModalProps> = ({
  isOpen,
  onClose,
  userGroups,
  onPaymentSuccess,
  autoStartCamera = false
}) => {
  // Step State
  const [step, setStep] = useState<ModalStep>('vendor');

  // Step 1: Vendor details
  const [vendorUpi, setVendorUpi] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(autoStartCamera);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && autoStartCamera) {
      setIsCameraActive(true);
    }
    if (!isOpen) {
      setIsCameraActive(false);
      setStep('vendor');
    }
  }, [isOpen, autoStartCamera]);

  // Step 2: Trip & Expense details
  const [selectedGroupId, setSelectedGroupId] = useState(userGroups[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');

  // Step 3 & 4: Payment Launch & Verification (Flipkart Multi-Tier Structure)
  const [selectedApp, setSelectedApp] = useState<UpiAppType>('phonepe');
  const [payMethodTab, setPayMethodTab] = useState<'apps' | 'qr' | 'manual'>('qr');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrTimeRemaining, setQrTimeRemaining] = useState<number>(300); // 5 mins
  const [txnRef, setTxnRef] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [manualUtrInput, setManualUtrInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAmountCopied, setIsAmountCopied] = useState(false);

  const copyUpiId = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(Number(amount).toFixed(2));
    setIsAmountCopied(true);
    setTimeout(() => setIsAmountCopied(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate dynamic QR code when entering payment selection
  useEffect(() => {
    if (step === 'select_app' && vendorUpi && amount) {
      const tracking = txnRef || `TRIP${Date.now().toString().slice(-8)}`;
      if (!txnRef) setTxnRef(tracking);
      generateUpiQrCode({
        upiId: vendorUpi.trim(),
        payeeName: vendorName.trim() || 'Vendor',
        amount: Number(amount),
        currency: 'INR',
        note: description.trim() || 'Trip Shared Expense',
        txnRef: tracking
      }).then((url) => {
        if (url) setQrCodeDataUrl(url);
      });
      setQrTimeRemaining(300);
    }
  }, [step, vendorUpi, amount, vendorName, description]);

  // QR countdown interval
  useEffect(() => {
    if (step !== 'select_app' || payMethodTab !== 'qr') return;
    const timer = setInterval(() => {
      setQrTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, payMethodTab]);

  // Camera scanner refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Keep selected group updated
  useEffect(() => {
    if (userGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(userGroups[0].id);
    }
  }, [userGroups, selectedGroupId]);

  const selectedTrip = userGroups.find((g) => g.id === selectedGroupId) || userGroups[0];

  // -------------------------------------------------------------
  // Camera Scanner Lifecycle
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isCameraActive || !videoRef.current) return;

    setCameraError(null);
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = typeof result === 'string' ? result : result?.data;
        if (!text) return;

        handleScannedQr(text);
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true
      }
    );

    scanner
      .start()
      .then(() => {
        scannerRef.current = scanner;
      })
      .catch((err) => {
        console.warn('Camera failed:', err);
        setCameraError('Camera access not granted or unavailable on this device.');
        setIsCameraActive(false);
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [isCameraActive]);

  // Parse NPCI UPI QR string: upi://pay?pa=...&pn=...&am=...&tn=...
  const handleScannedQr = (qrData: string) => {
    try {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
      setIsCameraActive(false);

      if (qrData.startsWith('upi://pay')) {
        const url = new URL(qrData);
        const pa = url.searchParams.get('pa') || '';
        const pn = url.searchParams.get('pn') || '';
        const am = url.searchParams.get('am') || '';
        const tn = url.searchParams.get('tn') || '';

        setVendorUpi(pa);
        setVendorName(decodeURIComponent(pn).replace(/\+/g, ' '));
        if (am) setAmount(am);
        if (tn) setDescription(decodeURIComponent(tn).replace(/\+/g, ' '));

        setStep('details');
      } else {
        // Raw text could be a UPI ID
        setVendorUpi(qrData.trim());
        setStep('details');
      }
    } catch {
      setVendorUpi(qrData.trim());
      setStep('details');
    }
  };

  // -------------------------------------------------------------
  // Note: We intentionally do NOT auto-commit on visibilitychange/focus
  // because the user may have tapped 'Cancel' inside PhonePe or Google Pay.
  // Instead, the user explicitly confirms whether the payment was completed or canceled.

  // Verify and record to PostgreSQL
  const verifyPaymentOnReturn = async (overrideUtr?: string) => {
    if (!selectedGroupId || !amount || isVerifying) return;

    setIsVerifying(true);
    setErrorMessage(null);

    const appLabels: Record<UpiAppType, string> = {
      phonepe: 'UPI (PhonePe)',
      gpay: 'UPI (Google Pay)',
      paytm: 'UPI (Paytm)',
      bhim: 'UPI (BHIM)',
      generic: 'UPI Direct'
    };

    try {
      const res = await groupService.verifyUpiPaymentStatus({
        txnRef: txnRef || `TRIP-${Date.now().toString().slice(-8)}`,
        groupId: selectedGroupId,
        amount: Number(amount).toFixed(2),
        description: description.trim() || (vendorName ? `Paid to ${vendorName}` : 'Vendor Payment'),
        category,
        paymentMethod: appLabels[selectedApp] || 'UPI',
        utr: overrideUtr || utrNumber.trim() || undefined,
        vendorUpi,
        vendorName
      });

      setVerifiedResult(res.data);
      setStep('success');
      await onPaymentSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification in progress. Confirm details below.');
    } finally {
      setIsVerifying(false);
    }
  };

  // -------------------------------------------------------------
  // Step Transitions
  // -------------------------------------------------------------
  const handleProceedToDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorUpi.trim()) {
      setErrorMessage('Please enter or scan the vendor UPI ID');
      return;
    }
    setErrorMessage(null);
    setStep('details');
  };

  const handleProceedToApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    if (!selectedGroupId) {
      setErrorMessage('Please select an expedition trip');
      return;
    }
    setErrorMessage(null);
    setStep('select_app');
  };

  // Launch PhonePe / GPay / Paytm
  const handleLaunchApp = async (app: UpiAppType) => {
    setSelectedApp(app);
    const trackingRef = `TRIP-TXN-${Date.now().toString().slice(-8)}`;
    setTxnRef(trackingRef);

    const isNative = isNativeMobileApp();
    const deepLink = buildUpiDeepLink({
      upiId: vendorUpi.trim(),
      payeeName: vendorName.trim() || 'Vendor',
      amount: Number(amount),
      note: description.trim() || 'Trip Shared Expense',
      currency: 'INR',
      txnRef: trackingRef,
      app,
      isNative
    });

    // 1. Native Mobile App (Capacitor Android) - Real-time free callback via startActivityForResult
    if (isNative) {
      try {
        setIsVerifying(true);
        setErrorMessage(null);
        const result = await NativeUpi.startPayment({
          url: deepLink,
          packageName: getAppPackageName(app)
        });

        if (result.status === 'SUCCESS') {
          // Received real bank approval and UTR directly from PhonePe / Google Pay!
          await verifyPaymentOnReturn(result.utr || undefined);
        } else if (result.status === 'CANCELLED') {
          // User pressed Cancel: Zero fake records created!
          setIsVerifying(false);
          setErrorMessage(`Payment was canceled in ${app.toUpperCase()}. No expense was recorded.`);
          setStep('select_app');
        } else {
          setIsVerifying(false);
          setErrorMessage(`Payment was declined or failed in ${app.toUpperCase()}.`);
          setStep('select_app');
        }
      } catch (err: any) {
        setIsVerifying(false);
        setErrorMessage(err.message || 'Failed to launch UPI App');
      }
      return;
    }

    // 2. Mobile Web Browser - Interactive Confirmation Flow (No blind auto-commits)
    setStep('verifying');
    launchUpiApp(deepLink);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 26, 12, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '24px',
          border: '1px solid var(--border-light)',
          width: '100%',
          maxWidth: '460px',
          padding: '22px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '2px 8px',
                  borderRadius: '9999px'
                }}
              >
                Direct NPCI Gateway · 100% Free
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
              {step === 'vendor' && '1. Vendor UPI / Scan QR'}
              {step === 'details' && '2. Trip & Expense Details'}
              {step === 'select_app' && '3. Choose Payment App'}
              {step === 'verifying' && '4. Verifying Payment'}
              {step === 'success' && 'Expense Verified & Split!'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: '#FEE2E2',
              color: '#B91C1C',
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 1: SCAN VENDOR QR OR ENTER VENDOR UPI ID                      */}
        {/* ------------------------------------------------------------------ */}
        {step === 'vendor' && (
          <div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.4 }}>
              Scan the restaurant, hotel, or merchant counter QR code, or enter their UPI ID manually.
            </p>

            {/* Camera QR Scanner Box */}
            <div style={{ marginBottom: '16px' }}>
              {isCameraActive ? (
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#000000',
                    textAlign: 'center',
                    border: '2px solid #10B981'
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      padding: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setIsCameraActive(false)}
                  >
                    <X size={18} color="#FFFFFF" />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#FFFFFF',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}
                  >
                    Align QR in viewfinder
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCameraActive(true)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '2px dashed #243E36',
                    background: 'rgba(36, 62, 54, 0.05)',
                    color: '#243E36',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#243E36',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Camera size={22} />
                  </div>
                  <span>Scan Vendor QR Code with Camera</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>
                    Supports PhonePe, GPay, Paytm & BharatPe QRs
                  </span>
                </button>
              )}

              {cameraError && (
                <div style={{ fontSize: '0.74rem', color: '#EF4444', marginTop: '6px', textAlign: 'center' }}>
                  {cameraError}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '16px 0',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                OR ENTER MANUALLY
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            </div>

            <form onSubmit={handleProceedToDetails}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Vendor / Merchant UPI ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. seaside.cafe@okhdfcbank or 9876543210@paytm"
                  value={vendorUpi}
                  onChange={(e) => setVendorUpi(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Vendor / Shop Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fisherman's Wharf Cafe"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <span>Continue to Amount & Trip</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 2: ENTER AMOUNT, SELECT TRIP, SPLIT & DESCRIPTION             */}
        {/* ------------------------------------------------------------------ */}
        {step === 'details' && (
          <div>
            {/* Vendor Chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(36, 62, 54, 0.07)',
                border: '1px solid rgba(36, 62, 54, 0.12)',
                marginBottom: '16px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                  Paying Vendor
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#243E36' }}>
                  {vendorName || vendorUpi}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{vendorUpi}</div>
              </div>
              <button
                type="button"
                onClick={() => setStep('vendor')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#243E36',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change
              </button>
            </div>

            <form onSubmit={handleProceedToApp}>
              {/* Amount */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Amount to Pay (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '2px solid #243E36',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Trip Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Select Expedition Trip to Add & Split
                </label>
                {userGroups.length > 0 ? (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    {userGroups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name} · {grp.destination} ({grp.expenseSplit || 'equal'} split)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#EF4444' }}>No active trips found.</div>
                )}
              </div>

              {/* Splitting Preset Banner */}
              {selectedTrip && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>
                    <Zap size={13} color="#10B981" />
                    <span>How it splits: {String(selectedTrip.expenseSplit || 'Equal').toUpperCase()} MODEL</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>
                    Configured during trip creation. Splits across all trip companions automatically.
                  </div>
                </div>
              )}

              {/* Description & Category */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Seafood Dinner at Wharf, Boat Tour, Highway Toll"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Food">Food & Dining</option>
                  <option value="Stay">Stay & Hotel</option>
                  <option value="Transport">Transport / Fuel / Taxi</option>
                  <option value="Activities">Activities / Tour</option>
                  <option value="Supplies">Supplies & Shopping</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStep('vendor')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    flex: 2,
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
                  <span>Select Payment App</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 3: FLIPKART-STYLE MULTI-TIER PAYMENT FLOW                     */}
        {/* ------------------------------------------------------------------ */}
        {step === 'select_app' && (
          <div>
            {/* Payment Summary Hero */}
            <div
              style={{
                background: 'linear-gradient(135deg, #14241F 0%, #1F382F 100%)',
                borderRadius: '18px',
                padding: '16px',
                color: '#FFFFFF',
                marginBottom: '14px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>
                  Trip Shared Expense
                </span>
                <span style={{ fontSize: '0.64rem', color: '#6EE7B7', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={11} /> 100% Secure NPCI
                </span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 6px', color: '#A7F3D0' }}>
                ₹{Number(amount).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.95)' }}>
                To: <strong>{vendorName || vendorUpi}</strong> ({vendorUpi})
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                Trip: {selectedTrip?.name} · {description || 'Shared Expense'}
              </div>
            </div>

            {/* Flipkart Multi-Option Payment Navigation Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                background: 'rgba(36, 62, 54, 0.08)',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '16px'
              }}
            >
              {/* Scan QR - RECOMMENDED first tab */}
              <button
                type="button"
                onClick={() => setPayMethodTab('qr')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: payMethodTab === 'qr' ? '1.5px solid #10B981' : 'none',
                  background: payMethodTab === 'qr' ? '#ECFDF5' : 'transparent',
                  color: payMethodTab === 'qr' ? '#065F46' : 'var(--text-secondary)',
                  fontWeight: payMethodTab === 'qr' ? 700 : 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: payMethodTab === 'qr' ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <QrCode size={13} />
                <span>Scan QR ✓</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethodTab('apps')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: payMethodTab === 'apps' ? '#FFFFFF' : 'transparent',
                  color: payMethodTab === 'apps' ? '#14241F' : 'var(--text-secondary)',
                  fontWeight: payMethodTab === 'apps' ? 700 : 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: payMethodTab === 'apps' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Smartphone size={13} />
                <span>UPI Apps</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethodTab('manual')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: payMethodTab === 'manual' ? '#FFFFFF' : 'transparent',
                  color: payMethodTab === 'manual' ? '#14241F' : 'var(--text-secondary)',
                  fontWeight: payMethodTab === 'manual' ? 700 : 600,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: payMethodTab === 'manual' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Copy size={13} />
                <span>Manual Pay</span>
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OPTION 1: 1-TAP UPI APPS (Intent Flow)                         */}
            {/* ------------------------------------------------------------- */}
            {payMethodTab === 'apps' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Scan QR code below with any UPI app:
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 700 }}>
                    ✓ 100% Works · No bank blocks
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {/* PhonePe */}
                  <button
                    type="button"
                    onClick={() => handleLaunchApp('phonepe')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '16px',
                      border: '1.5px solid #5f259f',
                      background: 'rgba(95, 37, 159, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#5f259f',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        flexShrink: 0
                      }}
                    >
                      पे
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>PhonePe</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B' }}>1-Tap Intent</div>
                    </div>
                  </button>

                  {/* Google Pay */}
                  <button
                    type="button"
                    onClick={() => handleLaunchApp('gpay')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '16px',
                      border: '1.5px solid #1A73E8',
                      background: 'rgba(26, 115, 232, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}
                    >
                      <span style={{ color: '#4285F4' }}>G</span>
                      <span style={{ color: '#EA4335' }}>P</span>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>Google Pay</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B' }}>1-Tap Intent</div>
                    </div>
                  </button>

                  {/* Paytm */}
                  <button
                    type="button"
                    onClick={() => handleLaunchApp('paytm')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '16px',
                      border: '1.5px solid #00B9F5',
                      background: 'rgba(0, 185, 245, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#002E6E',
                        color: '#00B9F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.66rem',
                        flexShrink: 0
                      }}
                    >
                      Paytm
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>Paytm</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B' }}>1-Tap Intent</div>
                    </div>
                  </button>

                  {/* Any UPI / BHIM */}
                  <button
                    type="button"
                    onClick={() => handleLaunchApp('generic')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '16px',
                      border: '1.5px solid #243E36',
                      background: 'rgba(36, 62, 54, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#243E36',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        flexShrink: 0
                      }}
                    >
                      UPI
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B' }}>Any UPI App</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B' }}>BHIM / Bank</div>
                    </div>
                  </button>
                </div>

                {/* Security note */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: '#FEF9EC',
                    border: '1px solid #FDE68A',
                    fontSize: '0.72rem',
                    color: '#92400E',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Note:</strong> Some banks (Paytm, PhonePe) block deep links from third-party apps as a security measure. If payment fails with "declined for security reasons", switch to the <strong>Scan QR</strong> tab — that method always works.
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* OPTION 2: QR CODE SCAN-TO-PAY (Most Reliable, No Bank Blocks) */}
            {/* ------------------------------------------------------------- */}
            {payMethodTab === 'qr' && (
              <div>
                {/* How it works banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  marginBottom: '14px'
                }}>
                  <ShieldCheck size={16} color="#15803D" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.72rem', color: '#166534', lineHeight: 1.4 }}>
                    <strong>Recommended:</strong> Open PhonePe/GPay/Paytm → tap <strong>Scan QR</strong> inside the app → scan this code → pay. This bypasses all bank security restrictions.
                  </div>
                </div>

                {/* Step numbers */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', justifyContent: 'center' }}>
                  {['1. Open UPI App', '2. Scan QR', '3. Confirm below'].map((step, i) => (
                    <div key={i} style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '6px 4px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#065F46'
                    }}>{step}</div>
                  ))}
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      marginBottom: '10px'
                    }}
                  >
                    <Clock size={12} />
                    <span>QR Expires in {formatTimer(qrTimeRemaining)}</span>
                  </div>

                  {qrCodeDataUrl ? (
                    <div
                      style={{
                        background: '#FFFFFF',
                        padding: '14px',
                        borderRadius: '20px',
                        border: '3px solid #10B981',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                        display: 'inline-block',
                        margin: '0 auto'
                      }}
                    >
                      <img
                        src={qrCodeDataUrl}
                        alt="UPI Payment QR Code"
                        style={{
                          width: '200px',
                          height: '200px',
                          display: 'block',
                          borderRadius: '8px'
                        }}
                      />
                      <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>
                        Pay ₹{Number(amount).toFixed(2)} to {vendorName || vendorUpi}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                      Generating QR code...
                    </div>
                  )}
                </div>

                {/* Confirm button - goes to verifying step */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setStep('verifying')}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>I Scanned & Paid — Confirm ₹{Number(amount).toFixed(2)}</span>
                </button>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* OPTION 3: MANUAL TRANSFER & UTR INPUT (Fail-Safe)              */}
            {/* ------------------------------------------------------------- */}
            {payMethodTab === 'manual' && (
              <div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
                  Copy the UPI ID, open your bank app to transfer the exact amount, then enter the 12-digit UTR confirmation below.
                </p>

                {/* 1. Recipient UPI Copy Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Payee UPI ID
                    </div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {vendorUpi}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyUpiId(vendorUpi)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: isCopied ? '#059669' : '#FFFFFF',
                      color: isCopied ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* 2. Amount Copy Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Exact Amount
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#059669' }}>
                      ₹{Number(amount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyAmount}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      background: isAmountCopied ? '#059669' : '#FFFFFF',
                      color: isAmountCopied ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isAmountCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isAmountCopied ? 'Copied' : 'Copy ₹'}</span>
                  </button>
                </div>

                {/* 3. Direct App Shortcuts */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <a
                    href={getDirectAppLaunchUrl('phonepe')}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      background: 'rgba(95, 37, 159, 0.08)',
                      border: '1px solid #5f259f',
                      color: '#5f259f',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Open PhonePe</span>
                    <ExternalLink size={11} />
                  </a>

                  <a
                    href={getDirectAppLaunchUrl('paytm')}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      background: 'rgba(0, 185, 245, 0.08)',
                      border: '1px solid #00B9F5',
                      color: '#002E6E',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Open Paytm</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                {/* 4. Enter 12-Digit UTR Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Enter 12-Digit Bank UTR / Reference No:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 428190382910"
                    maxLength={18}
                    value={manualUtrInput}
                    onChange={(e) => setManualUtrInput(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #243E36',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                    Available on your transaction receipt screen under "UPI Transaction ID" or "UTR".
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={isVerifying || !manualUtrInput.trim()}
                  onClick={() => {
                    setUtrNumber(manualUtrInput.trim());
                    setStep('verifying');
                    verifyPaymentOnReturn(manualUtrInput.trim());
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: (!manualUtrInput.trim() || isVerifying) ? 'not-allowed' : 'pointer',
                    opacity: (!manualUtrInput.trim() || isVerifying) ? 0.6 : 1
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Verify UTR & Commit to Group</span>
                </button>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('details')}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back to Details
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 4: CONFIRM PAYMENT STATUS (Web Browser Interactive Guard)     */}
        {/* ------------------------------------------------------------------ */}
        {step === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(36, 62, 54, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #243E36',
                animation: isVerifying ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              <Zap size={28} color="#243E36" />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Did your payment go through?
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.4 }}>
              Payment of <strong>₹{Number(amount).toFixed(2)}</strong> was initiated for <strong>{vendorName || vendorUpi}</strong>.
              Please confirm the outcome from your UPI app screen.
            </p>

            {/* Tracking Reference */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                marginBottom: '16px',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Transaction Tracking Ref
              </span>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {txnRef}
              </div>
            </div>

            {/* Optional UTR Input from receipt */}
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Bank UTR / Ref No. (Optional from App Screen)
              </label>
              <input
                type="text"
                placeholder="e.g. 428190382910 (12 digits)"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={18}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                Found on your transaction receipt screen if you want to attach proof.
              </span>
            </div>

            {/* Action Buttons: Yes Paid vs No Canceled */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                disabled={isVerifying}
                className="btn-primary"
                onClick={() => verifyPaymentOnReturn()}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  opacity: isVerifying ? 0.7 : 1
                }}
              >
                <CheckCircle2 size={18} />
                <span>{isVerifying ? 'Recording & Splitting...' : `Yes, I Paid ₹${Number(amount).toFixed(2)}`}</span>
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={() => {
                  setErrorMessage('Payment was canceled or not completed. No expense was added.');
                  setStep('select_app');
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '9999px',
                  border: '1px solid #FCA5A5',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer'
                }}
              >
                <X size={16} />
                <span>No, Payment was Canceled / Failed</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => handleLaunchApp(selectedApp)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '10px',
                  background: 'rgba(36, 62, 54, 0.08)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry Launching App
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('select_app');
                  setPayMethodTab('qr');
                }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '10px',
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Switch to QR Code
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* STEP 5: SUCCESS STATE & SPLIT RECEIPT                              */}
        {/* ------------------------------------------------------------------ */}
        {step === 'success' && verifiedResult && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px'
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Payment Verified!
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 600, margin: '0 0 16px' }}>
              Committed to PostgreSQL & auto-split across {verifiedResult.groupName || selectedTrip?.name}
            </p>

            {/* Receipt Summary */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Amount Paid</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                  ₹{Number(verifiedResult.amount).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Vendor</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A' }}>
                  {vendorName || vendorUpi}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Split Ratio</span>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#243E36' }}>
                  {verifiedResult.splitModel || 'EQUAL'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Reference</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                  {verifiedResult.paymentReference}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
