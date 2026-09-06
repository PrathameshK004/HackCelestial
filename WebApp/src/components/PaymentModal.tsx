import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  Sparkles, 
  Users,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { PaymentDetails } from '../types/group';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (payment: PaymentDetails) => void;
  groupName: string;
  memberCount: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  groupName,
  memberCount
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [upiId, setUpiId] = useState('triptual.organizer@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('•••');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedTxnId, setCompletedTxnId] = useState('');

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const generatedTxnId = 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      setCompletedTxnId(generatedTxnId);
      setIsProcessing(false);
      setIsSuccess(true);

      const paymentRecord: PaymentDetails = {
        status: 'PAID',
        amount: 19,
        currency: 'INR',
        transactionId: generatedTxnId,
        paymentMethod: selectedMethod,
        paidAt: new Date().toISOString()
      };

      setTimeout(() => {
        onPaymentSuccess(paymentRecord);
      }, 1200);
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={isProcessing ? undefined : onClose}>
      <div 
        className="modal-dialog payment-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        {/* Modal Header */}
        <div className="payment-modal-header">
          <div className="payment-header-left">
            <div className="payment-brand-badge">
              <Sparkles size={18} className="payment-sparkle-icon" />
            </div>
            <div>
              <div className="payment-modal-title-row">
                <h3 className="payment-modal-title">Group Tier Upgrade</h3>
                <span className="payment-tier-pill">7+ Members</span>
              </div>
              <p className="payment-modal-subtitle">
                Unlock unlimited trip coordination for large travel squads
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={onClose}
              aria-label="Close payment modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {isSuccess ? (
          <div className="payment-success-view">
            <div className="payment-success-icon-ring">
              <CheckCircle2 size={44} className="text-emerald-500" />
            </div>
            <h3 className="payment-success-title">Payment Successful!</h3>
            <p className="payment-success-desc">
              Your group upgrade fee of <strong>₹19.00</strong> has been verified.
            </p>
            <div className="payment-receipt-badge">
              <span>Transaction ID:</span>
              <strong>{completedTxnId}</strong>
            </div>
            <div className="payment-success-redirecting">
              <Loader2 size={16} className="spin-animation" />
              <span>Finalizing group creation...</span>
            </div>
          </div>
        ) : (
          <div className="payment-modal-body">
            {/* Bill Summary Banner */}
            <div className="payment-bill-card">
              <div className="payment-bill-top">
                <div className="payment-trip-info">
                  <span className="payment-bill-trip-label">Trip:</span>
                  <strong className="payment-bill-trip-name">{groupName || 'My Group Trip'}</strong>
                </div>
                <span className="payment-member-counter">
                  <Users size={14} />
                  {memberCount} Travelers
                </span>
              </div>

              <div className="payment-bill-divider" />

              <div className="payment-bill-line">
                <span>Free Tier Allowance (Up to 6 Travelers)</span>
                <span className="payment-bill-free">₹0.00 (FREE)</span>
              </div>
              <div className="payment-bill-line">
                <span>Large Squad Upgrade (7th Member & Above)</span>
                <span className="payment-bill-charge">₹19.00</span>
              </div>

              <div className="payment-bill-divider" />

              <div className="payment-bill-total-row">
                <div>
                  <div className="payment-total-label">Total Payable</div>
                  <div className="payment-total-subtext">One-time fee per trip ledger</div>
                </div>
                <div className="payment-total-amount">₹19.00</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-methods-tabs">
              <button
                type="button"
                className={`payment-tab-btn ${selectedMethod === 'UPI' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('UPI')}
              >
                <Smartphone size={16} />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                className={`payment-tab-btn ${selectedMethod === 'CARD' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('CARD')}
              >
                <CreditCard size={16} />
                <span>Card</span>
              </button>
              <button
                type="button"
                className={`payment-tab-btn ${selectedMethod === 'NET_BANKING' ? 'active' : ''}`}
                onClick={() => setSelectedMethod('NET_BANKING')}
              >
                <Building2 size={16} />
                <span>Net Banking</span>
              </button>
            </div>

            {/* Method Content */}
            {selectedMethod === 'UPI' && (
              <div className="payment-method-box">
                <div className="upi-app-badges">
                  <span className="upi-badge gpay">Google Pay</span>
                  <span className="upi-badge phonepe">PhonePe</span>
                  <span className="upi-badge paytm">Paytm</span>
                  <span className="upi-badge bhim">BHIM UPI</span>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label" htmlFor="upi-id-input">
                    UPI ID / VPA
                  </label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <QrCode size={18} />
                    </div>
                    <input
                      id="upi-id-input"
                      type="text"
                      className="text-input"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. mobile@upi or username@okaxis"
                    />
                  </div>
                  <p className="payment-helper-text">
                    ⚡ Instant authorization via any UPI app or scan simulation
                  </p>
                </div>
              </div>
            )}

            {selectedMethod === 'CARD' && (
              <div className="payment-method-box">
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <div className="input-with-icon">
                    <div className="input-icon">
                      <CreditCard size={18} />
                    </div>
                    <input
                      type="text"
                      className="text-input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Expires</label>
                    <input
                      type="text"
                      className="text-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input
                      type="password"
                      className="text-input"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'NET_BANKING' && (
              <div className="payment-method-box">
                <label className="form-label">Select Popular Bank</label>
                <div className="popular-banks-grid">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      className={`bank-chip-btn ${selectedBank === bank ? 'active' : ''}`}
                      onClick={() => setSelectedBank(bank)}
                    >
                      <Building2 size={14} />
                      <span>{bank}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="payment-security-notice">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>
                Simulated Sandbox Gateway • 256-bit SSL Secure Checkout • ₹19.00
              </span>
            </div>

            {/* Action Buttons */}
            <div className="payment-action-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary payment-pay-btn"
                onClick={handlePay}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="spin-animation" />
                    <span>Processing ₹19.00 Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Pay ₹19.00 Securely</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
