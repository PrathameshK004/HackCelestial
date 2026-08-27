import React, { useState } from 'react';
import { X, CheckCircle, Smartphone, CreditCard, Banknote, ShieldCheck, ArrowRight } from 'lucide-react';
import { SimplifiedTransfer } from '../../mock/dashboardMockData';

interface SettleUpModalProps {
  transfer: SimplifiedTransfer | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSettlement: (transferId: string, method: string, notes?: string) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  transfer,
  isOpen,
  onClose,
  onConfirmSettlement
}) => {
  if (!isOpen || !transfer) return null;

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash'>('upi');
  const [upiId, setUpiId] = useState(
    `${transfer.to.name.toLowerCase().replace(/\s+/g, '')}@okaxis`
  );
  const [notes, setNotes] = useState(`Settlement for trip expense`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsDone(true);
      setTimeout(() => {
        onConfirmSettlement(transfer.id, paymentMethod, notes);
        setIsDone(false);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card">
        {/* Modal Header */}
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Settlement Hub</span>
            <h3 className="modal-main-title">Record Payment & Settle Up</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {isDone ? (
          <div className="settle-success-view">
            <div className="success-pulse-circle">
              <CheckCircle size={44} className="text-emerald" />
            </div>
            <h4>Payment Recorded Successfully!</h4>
            <p>
              {transfer.currencySymbol}
              {transfer.amount.toLocaleString()} marked as settled between {transfer.from.name} and {transfer.to.name}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="settle-form-content">
            {/* Transfer Visual Pill */}
            <div className="transfer-summary-pill">
              <div className="party-chip">
                <div className="avatar-dot" style={{ backgroundColor: transfer.from.avatarBg }}>
                  {transfer.from.name[0]}
                </div>
                <span className="party-name">{transfer.from.name}</span>
                <span className="party-role-tag">Payer</span>
              </div>

              <div className="transfer-arrow-flow">
                <span className="amount-display-tag">
                  {transfer.currencySymbol}
                  {transfer.amount.toLocaleString()}
                </span>
                <div className="flow-line">
                  <ArrowRight size={18} className="arrow-pulse" />
                </div>
              </div>

              <div className="party-chip">
                <div className="avatar-dot" style={{ backgroundColor: transfer.to.avatarBg }}>
                  {transfer.to.name[0]}
                </div>
                <span className="party-name">{transfer.to.name}</span>
                <span className="party-role-tag role-receiver">Receiver</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="form-group-block">
              <label className="form-group-label">Payment Channel</label>
              <div className="payment-methods-grid">
                <button
                  type="button"
                  className={`method-option-card ${paymentMethod === 'upi' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  <Smartphone size={20} className="method-icon" />
                  <span className="method-title">UPI / QR</span>
                  <span className="method-subtitle">GPay, PhonePe, Paytm</span>
                </button>

                <button
                  type="button"
                  className={`method-option-card ${paymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={20} className="method-icon" />
                  <span className="method-title">Bank Transfer</span>
                  <span className="method-subtitle">IMPS / NEFT / Wire</span>
                </button>

                <button
                  type="button"
                  className={`method-option-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={20} className="method-icon" />
                  <span className="method-title">Cash Settlement</span>
                  <span className="method-subtitle">Paid in person</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'upi' && (
              <div className="upi-input-group">
                <label className="form-group-label">Receiver UPI ID / Phone</label>
                <div className="input-with-badge">
                  <input
                    type="text"
                    className="styled-text-input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="user@upi"
                  />
                  <span className="verified-badge">
                    <ShieldCheck size={14} /> Verified
                  </span>
                </div>
              </div>
            )}

            {/* Note / Memo */}
            <div className="form-group-block">
              <label className="form-group-label">Note / Reference (Optional)</label>
              <input
                type="text"
                className="styled-text-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Settle Goa Villa & Activities"
              />
            </div>

            {/* Modal Actions */}
            <div className="modal-bottom-actions">
              <button type="button" className="btn-cancel-flat" onClick={onClose} disabled={isProcessing}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-confirm-settlement"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex-center-gap">Processing...</span>
                ) : (
                  <span>
                    Confirm Settlement ({transfer.currencySymbol}
                    {transfer.amount.toLocaleString()})
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
