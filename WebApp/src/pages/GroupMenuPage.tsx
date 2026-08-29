import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleDollarSign,
  RefreshCw,
  WalletCards,
  X,
  MapPin,
  Users,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { groupService } from '../services/group.service';
import { GroupSummary, SettlementData } from '../types/group';
import { GroupMembersModal } from '../components/group/GroupMembersModal';

type GroupMenu = 'details' | 'ratio' | 'pay';

interface GroupMenuPageProps {
  group: GroupSummary;
  settlement: SettlementData;
  initialMenu?: GroupMenu;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSettled: () => Promise<void>;
}

export const GroupMenuPage: React.FC<GroupMenuPageProps> = ({
  group,
  settlement,
  initialMenu = 'details',
  onBack,
  onRefresh,
  onSettled
}) => {
  const [menu, setMenu] = useState<GroupMenu>(initialMenu);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [expense, setExpense] = useState({
    description: '',
    amount: '',
    participants: settlement.members.map((m) => String(m.id))
  });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [upiUri, setUpiUri] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isSettled = group.status === 'SETTLED';

  const navigate = (nextMenu: GroupMenu) => {
    window.history.pushState({ groupMenu: nextMenu }, '', `#group/${group.id}/${nextMenu}`);
    setMenu(nextMenu);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextMenu = window.location.hash.split('/').pop() as GroupMenu;
      if (['details', 'ratio', 'pay'].includes(nextMenu)) setMenu(nextMenu);
      else onBack();
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ groupMenu: initialMenu }, '', `#group/${group.id}/${initialMenu}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [group.id, initialMenu, onBack]);

  useEffect(() => () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
  }, []);

  const startScanner = () => {
    setMessage('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera requires HTTPS or localhost.');
      return;
    }
    setCameraOpen(true);
  };

  const openUpiIntent = (intent: string) => {
    const link = document.createElement('a');
    link.href = intent;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = typeof result === 'string' ? result : result?.data;
        if (!text) return;
        scanner.stop();
        setCameraOpen(false);
        setUpiUri(text);
        setPaymentMethod('UPI');
        try {
          const parsed = new URL(text);
          const amount = parsed.searchParams.get('am') || '';
          const note = parsed.searchParams.get('tn') || '';
          setExpense((prev) => ({
            ...prev,
            amount: amount || prev.amount,
            description: note || prev.description
          }));
        } catch {
          // ignore
        }
      },
      { returnDetailedScanResult: true }
    );
    scanner.start().catch(() => {
      setMessage('Could not initialize camera scanner.');
      setCameraOpen(false);
    });
    scannerRef.current = scanner;
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [cameraOpen]);

  const toggleParticipant = (memberId: string) => {
    setExpense((prev) => {
      const exists = prev.participants.includes(memberId);
      const next = exists
        ? prev.participants.filter((id) => id !== memberId)
        : [...prev.participants, memberId];
      return { ...prev, participants: next };
    });
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense.description.trim() || !expense.amount || Number(expense.amount) <= 0) {
      setMessage('Please enter a valid description and amount.');
      return;
    }
    if (expense.participants.length === 0) {
      setMessage('Please select at least one participant.');
      return;
    }

    setIsSubmitting(true);
    let paymentReference: string | undefined = upiUri || undefined;

    try {
      if (paymentMethod === 'UPI' && !upiUri) {
        const organizer = settlement.members.find((m) => m.role === 'Organizer') || settlement.members[0];
        const upiId = organizer?.upiId || 'organizer@bank';
        const intent = new URL('upi://pay');
        intent.searchParams.set('pa', upiId);
        intent.searchParams.set('pn', organizer?.name || 'Group Organizer');
        intent.searchParams.set('tn', expense.description.trim());
        intent.searchParams.set('am', Number(expense.amount).toFixed(2));
        intent.searchParams.set('cu', group.currency);
        paymentReference = intent.toString();
        setUpiUri(paymentReference);
        setPaymentPending(true);
        openUpiIntent(paymentReference);
        return;
      }

      await groupService.addExpense(group.id, {
        description: expense.description.trim(),
        amount: Number(expense.amount).toFixed(2),
        participants: expense.participants,
        paymentMethod,
        paymentReference
      });
      await onRefresh();
      setExpense({
        description: '',
        amount: '',
        participants: settlement.members.map((m) => String(m.id))
      });
      setMessage('Expense recorded successfully.');
      navigate('details');
    } catch (err: any) {
      setMessage(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmUpi = async () => {
    setPaymentPending(false);
    setIsSubmitting(true);
    try {
      await groupService.addExpense(group.id, {
        description: expense.description.trim(),
        amount: Number(expense.amount).toFixed(2),
        participants: expense.participants,
        paymentMethod: 'UPI',
        paymentReference: upiUri
      });
      await onRefresh();
      setExpense({
        description: '',
        amount: '',
        participants: settlement.members.map((m) => String(m.id))
      });
      setMessage('UPI payment recorded successfully.');
      navigate('details');
    } catch (err: any) {
      setMessage(err.message || 'Failed to record UPI expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payTransfer = async (
    transfer: SettlementData['transfers'][number],
    method: 'CASH' | 'UPI'
  ) => {
    const payee = settlement.members.find((m) => String(m.id) === transfer.to);
    const payer = settlement.members.find((m) => String(m.id) === transfer.from);
    if (!payee || !payer) return;

    const remarks = window.prompt('Settlement remarks', `Settlement to ${payee.name}`);
    if (!remarks?.trim()) return;
    let reference: string | undefined;

    if (method === 'CASH') {
      if (!window.confirm(`Confirm cash settlement of ${group.currency} ${transfer.amount} to ${payee.name}?`))
        return;
    } else {
      if (!payee.upiId) {
        setMessage('This payee has no UPI ID saved. Ask them to update their profile.');
        return;
      }
      const intent = new URL('upi://pay');
      intent.searchParams.set('pa', payee.upiId);
      intent.searchParams.set('pn', payee.name);
      intent.searchParams.set('am', transfer.amount);
      intent.searchParams.set('tn', remarks.trim());
      intent.searchParams.set('cu', group.currency);
      reference = intent.toString();
      openUpiIntent(reference);
      if (!window.confirm('Did the UPI payment succeed?')) return;
    }

    try {
      await groupService.recordSettlement(group.id, {
        paidTo: payee.id.toString(),
        amount: transfer.amount,
        remarks: remarks.trim(),
        paymentMethod: method,
        paymentReference: reference
      });
      await onRefresh();
      setMessage('Settlement payment recorded successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to record settlement.');
    }
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title + Sync */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              type="button"
              className="btn-icon-circle"
              onClick={onBack}
              title="Return to Trips"
              style={{
                width: '38px',
                height: '38px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={18} color="var(--text-primary)" />
            </button>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.3rem',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {group.name}
              </h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {group.destination} · {settlement.members.length} Travelers
              </p>
            </div>
          </div>

          <button
            type="button"
            className="profile-header-icon-btn"
            style={{ padding: '6px 12px', fontSize: '0.74rem', flexShrink: 0 }}
            onClick={onRefresh}
            title="Refresh ledger"
          >
            <RefreshCw size={13} />
            <span>Sync</span>
          </button>
        </div>

        {/* Notice alert message */}
        {message && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px',
              background: 'rgba(70, 75, 41, 0.1)',
              color: 'var(--accent-olive)'
            }}
          >
            <Check size={14} />
            <span>{message}</span>
          </div>
        )}

        {/* Hero Group Card */}
        <section
          style={{
            background: 'linear-gradient(135deg, var(--accent-olive) 0%, #3A4023 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 18px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: '#FFFFFF', margin: 0 }}>
                  {group.destination}
                </h2>
                <MapPin size={16} color="var(--accent-chartreuse)" />
              </div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.8)', marginTop: '2px' }}>
                {group.name} · {group.currency} Base Ledger
              </div>
            </div>

            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: isSettled ? 'rgba(225, 29, 72, 0.2)' : 'var(--accent-chartreuse)',
                color: isSettled ? '#FFFFFF' : 'var(--accent-olive)',
                padding: '3px 9px',
                borderRadius: '9999px'
              }}
            >
              {isSettled ? 'Settled' : 'Active'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Click to view all real members in this group"
            >
              <Users size={12} />
              <span style={{ fontWeight: 600 }}>{settlement.members.length} Members</span>
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.14)', padding: '4px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem' }}>
              <ShieldCheck size={12} />
              <span>Total: {group.currency} {settlement.expenses.reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Tab Navigation Bar */}
        <div
          className="clean-section-card"
          style={{
            padding: '6px',
            marginBottom: '16px',
            display: 'flex',
            gap: '6px',
            background: 'var(--bg-surface)'
          }}
        >
          <button
            type="button"
            className={`category-pill ${menu === 'details' ? 'active' : ''}`}
            onClick={() => navigate('details')}
            style={{ flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '0.74rem' }}
          >
            <Receipt size={13} />
            <span>Purchases ({settlement.expenses.length})</span>
          </button>

          {!isSettled && (
            <button
              type="button"
              className={`category-pill ${menu === 'ratio' ? 'active' : ''}`}
              onClick={() => navigate('ratio')}
              style={{ flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '0.74rem' }}
            >
              <CircleDollarSign size={13} />
              <span>Debts ({settlement.transfers.length})</span>
            </button>
          )}

          {!isSettled && (
            <button
              type="button"
              className={`category-pill ${menu === 'pay' ? 'active' : ''}`}
              onClick={() => navigate('pay')}
              style={{ flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '0.74rem' }}
            >
              <WalletCards size={13} />
              <span>Add Bill</span>
            </button>
          )}
        </div>

        {/* ================= TAB 1: DETAILS & EXPENSE LEDGER ================= */}
        {menu === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                  Itemized Expenses
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Real-time ledger shared among all trip travelers.
                </p>
              </div>
            </div>

            {settlement.expenses.length === 0 ? (
              <div className="clean-section-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.8rem', margin: '0 0 8px' }}>No expenses recorded for this trip yet.</p>
                {!isSettled && (
                  <button
                    type="button"
                    className="btn-primary-luxury"
                    style={{ padding: '6px 14px', fontSize: '0.74rem', margin: '0 auto' }}
                    onClick={() => navigate('pay')}
                  >
                    Add First Expense
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlement.expenses.map((record) => {
                  const payerName =
                    record.paidByName ||
                    settlement.members.find((m) => String(m.id) === String(record.paidBy))?.name ||
                    'Traveler';
                  return (
                    <div
                      key={record.id}
                      className="clean-section-card"
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'var(--accent-olive-subtle)',
                            color: 'var(--accent-olive)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Receipt size={16} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {record.description}
                            </span>
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '9999px',
                                background: 'var(--bg-surface-warm)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {record.paymentMethod || 'CASH'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Paid by {payerName}</span>
                            <span>·</span>
                            <span>Split with {record.shares.length} members</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {group.currency} {Number(record.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                          {new Date(record.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isSettled && settlement.transfers.length === 0 && settlement.expenses.length > 0 && (
              <button
                type="button"
                className="btn-primary-luxury"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '10px', fontSize: '0.78rem' }}
                onClick={onSettled}
              >
                <Check size={14} />
                <span>Mark Group as Settled</span>
              </button>
            )}
          </div>
        )}

        {/* ================= TAB 2: RATIO & OPTIMAL SETTLEMENTS ================= */}
        {menu === 'ratio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ marginBottom: '2px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                Optimal Debt Resolution
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                AI-collapsed direct transactions to clear all obligations.
              </p>
            </div>

            {settlement.transfers.length === 0 ? (
              <div className="clean-section-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <Check size={32} style={{ margin: '0 auto 8px', color: 'var(--accent-emerald)' }} />
                <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '1rem' }}>
                  All Balances are Settled!
                </h4>
                <p style={{ fontSize: '0.76rem' }}>Everyone is balanced. No pending payments in this group.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlement.transfers.map((tx) => (
                  <div
                    key={`${tx.from}-${tx.to}`}
                    className="clean-section-card"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.fromName}</span>
                        <ArrowRight size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-olive)' }}>{tx.toName}</span>
                      </div>

                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                        {group.currency} {tx.amount}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-primary-luxury"
                        style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: '0.74rem' }}
                        onClick={() => payTransfer(tx, 'UPI')}
                      >
                        Pay UPI
                      </button>
                      <button
                        type="button"
                        className="profile-header-icon-btn"
                        style={{ flex: 1, justifyContent: 'center', padding: '7px', fontSize: '0.74rem' }}
                        onClick={() => payTransfer(tx, 'CASH')}
                      >
                        Cash Settled
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ADD EXPENSE FORM ================= */}
        {!isSettled && menu === 'pay' && (
          <div className="clean-section-card" style={{ padding: '16px 14px' }}>
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                Record Shared Expense
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Add purchases or scan invoice QR codes to split automatically.
              </p>
            </div>

            <form onSubmit={recordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Expense Description
                </label>
                <input
                  className="styled-text-input"
                  required
                  placeholder="e.g. Seafood Dinner, Villa Booking, Fuel"
                  value={expense.description}
                  onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '9px 12px' }}
                />
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Total Amount ({group.currency})
                </label>
                <input
                  className="styled-text-input font-bold"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={expense.amount}
                  onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '9px 12px' }}
                />
              </div>

              {/* Split Members Checkboxes */}
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Split Among Members ({expense.participants.length} selected)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                  {settlement.members.map((m) => {
                    const isChecked = expense.participants.includes(String(m.id));
                    return (
                      <button
                        key={String(m.id)}
                        type="button"
                        className={`category-pill ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleParticipant(String(m.id))}
                        style={{ padding: '6px 10px', fontSize: '0.72rem', justifyContent: 'center' }}
                      >
                        <Check size={11} style={{ opacity: isChecked ? 1 : 0.2 }} />
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Payment Channel
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`category-pill ${paymentMethod === 'CASH' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('CASH')}
                    style={{ flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.74rem' }}
                  >
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    className={`category-pill ${paymentMethod === 'UPI' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('UPI')}
                    style={{ flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.74rem' }}
                  >
                    <span>UPI / QR</span>
                  </button>
                </div>
              </div>

              {/* QR Scanner Trigger */}
              <button
                type="button"
                className="profile-header-icon-btn"
                onClick={startScanner}
                style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '0.74rem' }}
              >
                <Camera size={14} />
                <span>Scan Merchant / UPI QR Code</span>
              </button>

              {cameraOpen && (
                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setCameraOpen(false)}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {paymentPending && (
                <button
                  type="button"
                  className="btn-primary-luxury"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', background: 'var(--accent-emerald)', fontSize: '0.78rem' }}
                  onClick={confirmUpi}
                  disabled={isSubmitting}
                >
                  <Check size={14} />
                  <span>Confirm UPI Payment Completed</span>
                </button>
              )}

              <button
                type="submit"
                className="btn-primary-luxury"
                disabled={isSubmitting}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.78rem', marginTop: '4px' }}
              >
                <span>{isSubmitting ? 'Recording Expense...' : 'Save Group Expense'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Group Real Members Modal */}
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          groupName={group.name}
          destination={group.destination}
          members={settlement.members}
          currency={group.currency}
        />
      </div>
    </div>
  );
};
