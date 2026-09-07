import React, { useState } from 'react';
import { X, CheckCircle, Smartphone, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import { SimplifiedTransfer } from '../../mock/dashboardMockData';
import { groupService } from '../../services/group.service';
import { UpiAppSelector } from '../payment/UpiAppSelector';

interface SettleUpModalProps {
  transfer: SimplifiedTransfer | null;
  groupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSettlement: (transferId: string, method: string, notes?: string) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  transfer,
  groupId,
  isOpen,
  onClose,
  onConfirmSettlement
}) => {
  if (!isOpen || !transfer) return null;

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash'>('upi');
  const upiId = (transfer.to as any).upiId || `${transfer.to.name.toLowerCase().replace(/\s+/g, '')}@okaxis`;
  const [notes, setNotes] = useState(`Settlement for trip expense`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [confirmedApp, setConfirmedApp] = useState('UPI');

  const executeSettlementRecord = async (methodLabel: string, refId?: string) => {
    setIsProcessing(true);
    try {
      if (groupId) {
        await groupService.recordSettlement(groupId, {
          fromMemberId: transfer.from.id,
          paidTo: transfer.to.id,
          amount: Number(transfer.amount).toFixed(2),
          remarks: notes.trim(),
          paymentMethod: methodLabel,
          paymentReference: refId || (methodLabel.includes('UPI') ? upiId : undefined)
        });
      }
    } catch (err) {
      console.warn('Backend record settlement note:', err);
    } finally {
      setIsProcessing(false);
      setIsDone(true);
      setTimeout(() => {
        onConfirmSettlement(transfer.id, methodLabel, notes);
        setIsDone(false);
        onClose();
      }, 1200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const methodLabel = paymentMethod === 'cash' ? 'CASH' : (paymentMethod === 'card' ? 'IMPS / Bank' : confirmedApp);
    await executeSettlementRecord(methodLabel);
  };

  const handleUpiPaymentCompleted = async (ref: string, app: string) => {
    const appNames: Record<string, string> = {
      phonepe: 'UPI (PhonePe)',
      gpay: 'UPI (Google Pay)',
      paytm: 'UPI (Paytm)',
      bhim: 'UPI (BHIM)',
      generic: 'UPI'
    };
    const methodLabel = appNames[app] || 'UPI';
    setConfirmedApp(methodLabel);
    await executeSettlementRecord(methodLabel, ref);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 26, 12, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-light)',
          width: '100%',
          maxWidth: '480px',
          padding: '20px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.18)',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: '16px'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '9999px',
                display: 'inline-block'
              }}
            >
              Settlement Gateway
            </span>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '4px 0 0',
                lineHeight: 1.2
              }}
            >
              Pay & Settle Up
            </h3>
          </div>

          <button
            type="button"
            className="btn-icon-circle"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-surface-warm)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={16} color="var(--text-primary)" />
          </button>
        </div>

        {isDone ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}
            >
              <CheckCircle size={32} color="#059669" />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Payment Settled Successfully!
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {transfer.currencySymbol}{transfer.amount.toLocaleString()} marked as settled between {transfer.from.name} and {transfer.to.name}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Transfer Visual Card */}
            <div
              style={{
                background: 'var(--bg-surface-warm)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              {/* Payer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: transfer.from.avatarBg || '#059669',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    flexShrink: 0
                  }}
                >
                  {transfer.from.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {transfer.from.name}
                  </div>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#E11D48',
                      background: 'rgba(225, 29, 72, 0.1)',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      display: 'inline-block'
                    }}
                  >
                    Payer
                  </span>
                </div>
              </div>

              {/* Arrow Flow & Amount */}
              <div style={{ textAlign: 'center', flexShrink: 0, padding: '0 6px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-olive)' }}>
                  {transfer.currencySymbol}{transfer.amount.toLocaleString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  <ArrowRight size={14} color="var(--accent-olive)" />
                </div>
              </div>

              {/* Receiver */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textAlign: 'right' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {transfer.to.name}
                  </div>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#059669',
                      background: 'rgba(5, 150, 105, 0.12)',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      display: 'inline-block'
                    }}
                  >
                    Receiver
                  </span>
                </div>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: transfer.to.avatarBg || '#2563EB',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    flexShrink: 0
                  }}
                >
                  {transfer.to.name[0]}
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Payment Channel
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  style={{
                    background: paymentMethod === 'upi' ? '#FFFFFF' : 'var(--bg-surface-warm)',
                    border: paymentMethod === 'upi' ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    boxShadow: paymentMethod === 'upi' ? '0 2px 8px rgba(46,51,27,0.1)' : 'none'
                  }}
                >
                  <Smartphone size={18} color={paymentMethod === 'upi' ? 'var(--accent-olive)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>UPI Apps</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>PhonePe, GPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    background: paymentMethod === 'card' ? '#FFFFFF' : 'var(--bg-surface-warm)',
                    border: paymentMethod === 'card' ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    boxShadow: paymentMethod === 'card' ? '0 2px 8px rgba(46,51,27,0.1)' : 'none'
                  }}
                >
                  <CreditCard size={18} color={paymentMethod === 'card' ? 'var(--accent-olive)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>Bank</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>IMPS / NEFT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    background: paymentMethod === 'cash' ? '#FFFFFF' : 'var(--bg-surface-warm)',
                    border: paymentMethod === 'cash' ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 6px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    boxShadow: paymentMethod === 'cash' ? '0 2px 8px rgba(46,51,27,0.1)' : 'none'
                  }}
                >
                  <Banknote size={18} color={paymentMethod === 'cash' ? 'var(--accent-olive)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cash</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>In Person</span>
                </button>
              </div>
            </div>

            {/* UPI App Launcher Section */}
            {paymentMethod === 'upi' ? (
              <div style={{ marginTop: '4px' }}>
                <UpiAppSelector
                  details={{
                    upiId,
                    payeeName: transfer.to.name,
                    amount: transfer.amount,
                    currency: (transfer as any).currency || 'INR',
                    note: notes,
                    txnRef: `TRIP-STL-${transfer.id.slice(-6).toUpperCase()}`
                  }}
                  onPaymentCompleted={handleUpiPaymentCompleted}
                  currencySymbol={transfer.currencySymbol}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Settlement Remarks
                  </label>
                  <input
                    type="text"
                    className="styled-text-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Cleared room share & activities"
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '9px 12px' }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-light)'
                  }}
                >
                  <button
                    type="button"
                    className="btn-cancel-flat"
                    onClick={onClose}
                    disabled={isProcessing}
                    style={{ padding: '9px 16px', fontSize: '0.78rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isProcessing}
                    style={{ padding: '9px 18px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {isProcessing ? 'Processing...' : `Confirm Settlement (${transfer.currencySymbol}${transfer.amount})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
