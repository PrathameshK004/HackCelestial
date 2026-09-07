import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  History,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  Users,
  X,
  ExternalLink
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { groupService } from '../services/group.service';
import { GroupSummary, SettlementData, SettlementExpense, SettlementTransfer } from '../types/group';
import { GroupMembersModal } from '../components/group/GroupMembersModal';

type LedgerTab = 'expenses' | 'debts' | 'transactions' | 'balances';

interface GroupMenuPageProps {
  group: GroupSummary;
  settlement?: SettlementData | null;
  user?: any;
  initialMenu?: LedgerTab;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onSettled: () => Promise<void>;
}

export const GroupMenuPage: React.FC<GroupMenuPageProps> = ({
  group,
  settlement: initialSettlement,
  user,
  initialMenu = 'expenses',
  onBack,
  onRefresh,
  onSettled
}) => {
  const [activeTab, setActiveTab] = useState<LedgerTab>(initialMenu);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(initialSettlement || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSettlement);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Modals & Drawers
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<SettlementTransfer | null>(null);

  // Add Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Food',
    splitModel: 'EQUAL' as 'EQUAL' | 'PARTICIPANT_BASED' | 'ROOM_SHARE' | 'ACTIVITY_BASED' | 'ORGANIZER_PAID',
    paidByMemberId: '',
    participants: [] as string[],
    paymentMethod: 'CASH' as 'CASH' | 'UPI',
    paymentReference: ''
  });

  // Direct Settlement Form State
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    paymentMethod: 'UPI' as 'UPI' | 'CASH',
    remarks: '',
    reference: ''
  });

  // UI Toast & State
  const [toastMessage, setToastMessage] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Scanner State
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const isSettled = group.status === 'SETTLED' || settlementData?.groupStatus === 'SETTLED';

  // Fetch or sync settlement data
  const loadSettlement = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const res = await groupService.getSettlement(group.id);
      setSettlementData(res.data);
    } catch (err: any) {
      console.error('Failed to load settlement:', err);
      setToastMessage(err.message || 'Failed to sync ledger data.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!initialSettlement) {
      loadSettlement();
    } else {
      setSettlementData(initialSettlement);
      setIsLoading(false);
    }
  }, [initialSettlement, group.id]);

  // Cleanup QR Scanner on unmount
  useEffect(() => () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
  }, []);

  // Initialize participants in Add Expense form once members load
  useEffect(() => {
    if (settlementData?.members && settlementData.members.length > 0) {
      const allIds = settlementData.members.map((m) => String(m.id));
      setExpenseForm((prev) => ({
        ...prev,
        participants: prev.participants.length > 0 ? prev.participants : allIds,
        paidByMemberId: prev.paidByMemberId || allIds[0]
      }));
    }
  }, [settlementData]);

  // QR Scanner logic
  const startScanner = () => {
    setToastMessage('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setToastMessage('Camera requires HTTPS or localhost.');
      return;
    }
    setCameraOpen(true);
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
        setExpenseForm((prev) => ({
          ...prev,
          paymentMethod: 'UPI',
          paymentReference: text
        }));
        try {
          const parsed = new URL(text);
          const amount = parsed.searchParams.get('am') || '';
          const note = parsed.searchParams.get('tn') || '';
          setExpenseForm((prev) => ({
            ...prev,
            amount: amount || prev.amount,
            description: note || prev.description
          }));
        } catch {
          // ignore parsing error
        }
      },
      { returnDetailedScanResult: true }
    );
    scanner.start().catch(() => {
      setToastMessage('Could not initialize camera scanner.');
      setCameraOpen(false);
    });
    scannerRef.current = scanner;
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, [cameraOpen]);

  // Toggle single participant
  const toggleParticipant = (memberId: string) => {
    setExpenseForm((prev) => {
      const exists = prev.participants.includes(memberId);
      const next = exists
        ? prev.participants.filter((id) => id !== memberId)
        : [...prev.participants, memberId];
      return { ...prev, participants: next };
    });
  };

  // Select all / none
  const toggleAllParticipants = () => {
    if (!settlementData) return;
    const allIds = settlementData.members.map((m) => String(m.id));
    setExpenseForm((prev) => ({
      ...prev,
      participants: prev.participants.length === allIds.length ? [] : allIds
    }));
  };

  // Record a New Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setToastMessage('Please enter a valid description and positive amount.');
      return;
    }
    if (expenseForm.participants.length === 0) {
      setToastMessage('Please select at least one traveler to share the cost.');
      return;
    }

    setIsSubmitting(true);
    try {
      await groupService.addExpense(group.id, {
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount).toFixed(2),
        category: expenseForm.category,
        currency: group.currency,
        splitModel: expenseForm.splitModel,
        paidByMemberId: expenseForm.paidByMemberId || undefined,
        participants: expenseForm.participants,
        paymentMethod: expenseForm.paymentMethod,
        paymentReference: expenseForm.paymentReference || undefined
      });

      await loadSettlement(true);
      await onRefresh();

      setExpenseForm({
        description: '',
        amount: '',
        category: 'Food',
        splitModel: 'EQUAL',
        paidByMemberId: settlementData?.members[0]?.id ? String(settlementData.members[0].id) : '',
        participants: settlementData?.members.map((m) => String(m.id)) || [],
        paymentMethod: 'CASH',
        paymentReference: ''
      });

      setIsAddExpenseOpen(false);
      setToastMessage('Expense recorded & ledger rebalanced.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an Expense
  const handleDeleteExpense = async (expenseId: string, desc: string) => {
    if (!window.confirm(`Delete "${desc}"? The ledger and all member balances will rebalance.`)) return;
    try {
      await groupService.deleteExpense(group.id, expenseId);
      await loadSettlement(true);
      await onRefresh();
      setToastMessage('Expense deleted and ledger updated.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete expense.');
    }
  };

  // Open Settle Up Drawer for a Transfer
  const openSettleUp = (tx: SettlementTransfer, method: 'UPI' | 'CASH' = 'UPI') => {
    setSelectedTransfer(tx);
    const payee = settlementData?.members.find((m) => String(m.id) === (typeof tx.to === 'string' ? tx.to : tx.to?.id));
    setSettlementForm({
      amount: String(tx.amount),
      paymentMethod: method,
      remarks: `Settlement to ${tx.toName || payee?.name || 'Traveler'}`,
      reference: ''
    });
    setIsSettleUpModalOpen(true);
  };

  // Execute and record Direct Settlement
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    const payeeId = typeof selectedTransfer.to === 'string' ? selectedTransfer.to : selectedTransfer.to?.id;
    const payerId = typeof selectedTransfer.from === 'string' ? selectedTransfer.from : selectedTransfer.from?.id;
    if (!payeeId || !payerId) return;

    setIsSubmitting(true);
    try {
      await groupService.recordSettlement(group.id, {
        fromMemberId: String(payerId),
        paidTo: String(payeeId),
        amount: Number(settlementForm.amount || selectedTransfer.amount).toFixed(2),
        currency: group.currency,
        paymentMethod: settlementForm.paymentMethod,
        paymentReference: settlementForm.reference || undefined,
        remarks: settlementForm.remarks.trim() || 'Debt settlement'
      });

      await loadSettlement(true);
      await onRefresh();

      setIsSettleUpModalOpen(false);
      setSelectedTransfer(null);
      setToastMessage('Settlement payment recorded successfully.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to record settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger UPI App Intent on Mobile
  const handleLaunchUpi = (upiId: string, payeeName: string, amount: number) => {
    const intent = new URL('upi://pay');
    intent.searchParams.set('pa', upiId);
    intent.searchParams.set('pn', payeeName);
    intent.searchParams.set('am', Number(amount).toFixed(2));
    intent.searchParams.set('cu', group.currency);
    intent.searchParams.set('tn', `Triptual settlement for ${group.name}`);

    const uri = intent.toString();
    const link = document.createElement('a');
    link.href = uri;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Copy text helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Calculate user's personal net balance
  const userNetBalance = useMemo(() => {
    if (!settlementData?.members) return 0;
    const userMember = settlementData.members.find(
      (m: any) =>
        (user?.userId && m.userId === user.userId) ||
        (user?.emailId && m.email?.toLowerCase() === user.emailId.toLowerCase())
    );
    return userMember?.netBalance ?? 0;
  }, [settlementData, user]);

  const expensesList: SettlementExpense[] = settlementData?.expenses || [];
  const transfersList: SettlementTransfer[] = settlementData?.transfers || [];
  const settlementsList = settlementData?.settlements || [];
  const membersList = settlementData?.members || [];
  const totalSpend = settlementData?.totalSpend || expensesList.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="profile-page-root animate-fade-in" style={{ minHeight: '100vh', paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* ================= 1. HEADER & ACTIONS ================= */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'rgba(253, 251, 247, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            margin: '-12px -14px 16px',
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-light)',
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)'
          }}
        >
          {/* Left: Zero-Background Back Button */}
          <button
            type="button"
            className="btn-back-transparent"
            onClick={onBack}
            title="Return to Trips"
            aria-label="Return to Trips"
          >
            <ArrowLeft size={22} color="var(--text-primary)" />
          </button>

          {/* Center: Title & Subtitle with Status Badge */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={group.name}
            >
              {group.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                📍 {group.destination || 'Trip'} • {group.currency} Ledger
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isSettled ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  color: isSettled ? '#059669' : '#D97706',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                  lineHeight: 1.4
                }}
              >
                {isSettled ? 'Settled' : 'Active'}
              </span>
            </div>
          </div>

          {/* Right: 38px Symmetrical Circle Sync Button */}
          <button
            type="button"
            className="btn-icon-circle"
            onClick={() => loadSettlement()}
            title={isSyncing ? 'Syncing...' : 'Sync ledger with database'}
            disabled={isSyncing}
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
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Toast Alert Message */}
        {toastMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
              background: 'rgba(70, 75, 41, 0.12)',
              border: '1px solid rgba(70, 75, 41, 0.25)',
              color: 'var(--accent-olive)'
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= 2. HERO FINTECH METRICS STRIP ================= */}
        <section
          style={{
            background: 'linear-gradient(135deg, #3A4023 0%, var(--accent-olive) 100%)',
            color: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px 20px',
            marginBottom: '16px',
            boxShadow: '0 8px 24px -4px rgba(58, 64, 35, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
                Total Group Spend
              </span>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1.1, marginTop: '2px' }}>
                {group.currency} {Number(totalSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMembersModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Users size={13} />
              <span>{membersList.length} Travelers</span>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <div style={{ paddingRight: '6px', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '0.66rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Net Balance</div>
              <div
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: userNetBalance > 0.01 ? '#86efac' : userNetBalance < -0.01 ? '#fca5a5' : '#fef08a'
                }}
              >
                {userNetBalance > 0.01
                  ? `+${group.currency} ${userNetBalance.toFixed(2)}`
                  : userNetBalance < -0.01
                  ? `-${group.currency} ${Math.abs(userNetBalance).toFixed(2)}`
                  : 'Balanced'}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '0 4px', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <div style={{ fontSize: '0.66rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Purchases</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap' }}>
                {expensesList.length} {expensesList.length === 1 ? 'Bill' : 'Bills'}
              </div>
            </div>

            <div style={{ textAlign: 'right', paddingLeft: '6px' }}>
              <div style={{ fontSize: '0.66rem', opacity: 0.75, whiteSpace: 'nowrap' }}>Pending Debts</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', color: transfersList.length > 0 ? '#fed7aa' : '#86efac' }}>
                {transfersList.length} {transfersList.length === 1 ? 'Debt' : 'Debts'}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. FOUR SEGMENTED NAVIGATION TABS ================= */}
        <div className="ledger-tabs-track">
          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Receipt size={13} />
            <span>Bills</span>
            <span className="ledger-tab-badge">{expensesList.length}</span>
          </button>

          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === 'debts' ? 'active' : ''}`}
            onClick={() => setActiveTab('debts')}
          >
            <CircleDollarSign size={13} />
            <span>Debts</span>
            <span className="ledger-tab-badge">{transfersList.length}</span>
          </button>

          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <History size={13} />
            <span>History</span>
            <span className="ledger-tab-badge">{settlementsList.length}</span>
          </button>

          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
            onClick={() => setActiveTab('balances')}
          >
            <Users size={13} />
            <span>Balances</span>
          </button>
        </div>

        {/* Loading Spinner Skeleton */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent-olive)' }} />
            <p style={{ fontSize: '0.84rem' }}>Calculating live split balances & transactions...</p>
          </div>
        )}

        {/* ================= TAB 1: PURCHASES & ITEMIZED SPLITS ================= */}
        {!isLoading && activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tab Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Purchases & Splits
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Tap any bill to view itemized breakdown.
                </p>
              </div>

              {!isSettled && (
                <button
                  type="button"
                  className="btn-primary-luxury"
                  onClick={() => setIsAddExpenseOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    borderRadius: '999px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span>Add Bill</span>
                </button>
              )}
            </div>

            {/* Empty State */}
            {expensesList.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-card)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted)'
                }}
              >
                <Receipt size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '1.02rem' }}>
                  No Purchases Recorded Yet
                </h4>
                <p style={{ fontSize: '0.78rem', margin: '0 0 16px', maxWidth: '320px', marginInline: 'auto' }}>
                  Record flight tickets, stays, dinners, or gas. The ledger will calculate splits automatically.
                </p>
                {!isSettled && (
                  <button
                    type="button"
                    className="btn-primary-luxury"
                    onClick={() => setIsAddExpenseOpen(true)}
                    style={{ padding: '8px 18px', fontSize: '0.8rem', borderRadius: '999px' }}
                  >
                    Record First Purchase
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {expensesList.map((record) => {
                  const isExpanded = expandedExpenseId === record.id;
                  const payerName = record.paidByName || record.paidBy?.name || 'Traveler';
                  const splitsCount = record.splits?.length || membersList.length;

                  return (
                    <div
                      key={record.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.2s ease'
                      }}
                    >
                      {/* Main Card Row */}
                      <div
                        style={{
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedExpenseId(isExpanded ? null : record.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'var(--accent-olive-subtle)',
                              color: 'var(--accent-olive)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Receipt size={18} />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {record.description}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: 'var(--bg-surface-warm)',
                                  border: '1px solid var(--border-card)',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {record.paymentMethod || 'CASH'}
                              </span>
                              {record.splitModel && record.splitModel !== 'EQUAL' && (
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: 'rgba(5, 150, 105, 0.1)',
                                    color: '#059669'
                                  }}
                                >
                                  {record.splitModel.replace('_', ' ')}
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                              Paid by <strong>{payerName}</strong> • Split with {splitsCount} {splitsCount === 1 ? 'traveler' : 'travelers'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {group.currency} {Number(record.amount).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Split Details Drawer */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '12px 16px 14px 16px',
                            background: 'var(--bg-surface-warm)',
                            borderTop: '1px solid var(--border-light)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                              Participant Share Breakdown
                            </span>
                            {!isSettled && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteExpense(record.id, record.description);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete Bill</span>
                              </button>
                            )}
                          </div>

                          {record.splits && record.splits.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {record.splits.map((s) => {
                                const isPayer = String(s.memberId) === String(record.paidBy?.id);
                                return (
                                  <div
                                    key={s.id || s.memberId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '6px 10px',
                                      background: '#FFFFFF',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-card)',
                                      fontSize: '0.78rem'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div
                                        style={{
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          background: s.memberAvatar || 'var(--accent-olive)',
                                          color: '#FFFFFF',
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        {(s.memberName || 'T')[0].toUpperCase()}
                                      </div>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {s.memberName}
                                      </span>
                                      {isPayer && (
                                        <span
                                          style={{
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            background: 'rgba(70, 75, 41, 0.12)',
                                            color: 'var(--accent-olive)'
                                          }}
                                        >
                                          Payer
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                      {group.currency} {Number(s.computedAmount).toFixed(2)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Split equally among all {membersList.length} members ({group.currency} {(Number(record.amount) / Math.max(membersList.length, 1)).toFixed(2)} each).
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: DEBTS & SETTLE-UP (OPTIMAL TRANSFERS) ================= */}
        {!isLoading && activeTab === 'debts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
                Debt Simplification (Min-Cash-Flow)
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Algorithmic minimal transactions required to completely clear all balances.
              </p>
            </div>

            {transfersList.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  padding: '36px 18px'
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(5, 150, 105, 0.12)',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px'
                  }}
                >
                  <Check size={24} strokeWidth={3} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '1.1rem' }}>
                  All Balances are Balanced!
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                  No one in this group owes any money. The ledger is perfectly even.
                </p>
                {!isSettled && expensesList.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary-luxury"
                    onClick={onSettled}
                    style={{ padding: '8px 18px', fontSize: '0.78rem', borderRadius: '999px' }}
                  >
                    <Check size={14} />
                    <span>Mark Trip as Fully Settled</span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transfersList.map((tx, idx) => {
                  const toPayee = membersList.find((m) => String(m.id) === (typeof tx.to === 'string' ? tx.to : tx.to?.id));
                  const payeeUpi = toPayee?.upiId || (typeof tx.to === 'object' ? tx.to?.upiId : '');

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* From -> To Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {tx.fromName}
                          </span>
                          <ArrowRight size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-olive)' }}>
                            {tx.toName}
                          </span>
                        </div>

                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.18rem', fontWeight: 700, color: '#dc2626' }}>
                          {group.currency} {Number(tx.amount).toFixed(2)}
                        </div>
                      </div>

                      {/* Payee Details if UPI */}
                      {payeeUpi && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'var(--bg-surface-warm)',
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <span>UPI ID: <strong>{payeeUpi}</strong></span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payeeUpi)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-olive)', cursor: 'pointer', fontWeight: 600 }}
                          >
                            {copiedUpi ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!isSettled && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-primary-luxury"
                            onClick={() => {
                              if (payeeUpi) {
                                handleLaunchUpi(payeeUpi, tx.toName || 'Traveler', tx.amount);
                              }
                              openSettleUp(tx, 'UPI');
                            }}
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              padding: '8px 12px',
                              fontSize: '0.76rem',
                              borderRadius: '10px'
                            }}
                          >
                            <span>Pay via UPI</span>
                            <ExternalLink size={13} />
                          </button>

                          <button
                            type="button"
                            className="profile-header-icon-btn"
                            onClick={() => openSettleUp(tx, 'CASH')}
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              padding: '8px 12px',
                              fontSize: '0.76rem',
                              borderRadius: '10px'
                            }}
                          >
                            <span>Record Cash</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: COMPLETED TRANSACTIONS HISTORY ================= */}
        {!isLoading && activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
                Transactions & Settlement Audit
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Verified records of settled peer-to-peer payments and receipts.
              </p>
            </div>

            {settlementsList.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-card)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: 'var(--text-muted)'
                }}
              >
                <History size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '1rem' }}>
                  No Settlements Recorded Yet
                </h4>
                <p style={{ fontSize: '0.76rem' }}>
                  When members clear debts via UPI or Cash, proof and timestamps will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settlementsList.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'rgba(5, 150, 105, 0.12)',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Check size={16} strokeWidth={2.8} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {st.fromName} ➔ {st.toName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {st.paymentMethod} {st.remarks ? `• "${st.remarks}"` : ''} {st.paymentReference ? `• Ref: ${st.paymentReference}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                        +{st.currency} {Number(st.amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        {new Date(st.settledAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: TRAVELER BALANCES MATRIX ================= */}
        {!isLoading && activeTab === 'balances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.08rem', color: 'var(--text-primary)', margin: 0 }}>
                Traveler Balance Matrix
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Complete visibility into who spent, who absorbed cost, and current standings.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {membersList.map((m) => {
                const isUser = (user?.userId && m.userId === user.userId) || (user?.emailId && m.email?.toLowerCase() === user.emailId.toLowerCase());
                const net = m.netBalance || 0;
                const paid = m.totalPaid || 0;
                const owed = m.totalOwed || 0;

                return (
                  <div
                    key={String(m.id)}
                    style={{
                      background: isUser ? 'var(--bg-surface-warm)' : 'var(--bg-surface)',
                      border: isUser ? '1.5px solid var(--accent-olive)' : '1px solid var(--border-card)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: m.avatarBg || 'var(--accent-olive)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {(m.name || 'T')[0].toUpperCase()}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {m.name}
                            </span>
                            {isUser && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--accent-olive)', color: '#FFFFFF' }}>
                                You
                              </span>
                            )}
                            <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                              {m.role || 'Traveler'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>

                      {/* Net Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '0.96rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: net > 0.01 ? '#059669' : net < -0.01 ? '#dc2626' : 'var(--text-secondary)'
                          }}
                        >
                          {net > 0.01 ? `+${group.currency} ${net.toFixed(2)}` : net < -0.01 ? `-${group.currency} ${Math.abs(net).toFixed(2)}` : `${group.currency} 0.00`}
                        </div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {net > 0.01 ? 'Gets Back' : net < -0.01 ? 'Owes Money' : 'All Settled'}
                        </div>
                      </div>
                    </div>

                    {/* Paid vs Owed Micro Stats */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-light)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Total Funded: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{group.currency} {paid.toFixed(2)}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Share: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{group.currency} {owed.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 4. ADD EXPENSE BOTTOM DRAWER ================= */}
        {isAddExpenseOpen && (
          <div className="success-drawer-overlay" onClick={() => setIsAddExpenseOpen(false)}>
            <div
              className="success-drawer-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              style={{ maxHeight: '92vh' }}
            >
              <div className="success-drawer-handle-bar">
                <div className="success-drawer-handle" />
                <button
                  type="button"
                  className="success-drawer-close-btn"
                  onClick={() => setIsAddExpenseOpen(false)}
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              <div className="success-drawer-content" style={{ textAlign: 'left', alignItems: 'stretch' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Record Trip Purchase
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                  Add an expense. The ledger will distribute shares according to your split settings.
                </p>

                <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Description
                    </label>
                    <input
                      className="styled-text-input"
                      required
                      placeholder="e.g. Seafood Dinner, Villa Booking, Fuel"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '9px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Amount ({group.currency})
                      </label>
                      <input
                        className="styled-text-input font-bold"
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.86rem', padding: '9px 12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Category
                      </label>
                      <select
                        className="styled-text-input"
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '9px 12px' }}
                      >
                        <option value="Food">Food & Dining</option>
                        <option value="Lodging">Lodging & Stay</option>
                        <option value="Transport">Transport & Fuel</option>
                        <option value="Activities">Activities & Tickets</option>
                        <option value="Groceries">Groceries & Drinks</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Paid By
                      </label>
                      <select
                        className="styled-text-input"
                        value={expenseForm.paidByMemberId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, paidByMemberId: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '9px 12px' }}
                      >
                        {membersList.map((m) => (
                          <option key={String(m.id)} value={String(m.id)}>
                            {m.name} {m.role === 'Organizer' ? '(Organizer)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Split Model
                      </label>
                      <select
                        className="styled-text-input"
                        value={expenseForm.splitModel}
                        onChange={(e) => setExpenseForm({ ...expenseForm, splitModel: e.target.value as any })}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.82rem', padding: '9px 12px' }}
                      >
                        <option value="EQUAL">Equal Split</option>
                        <option value="PARTICIPANT_BASED">Participant Share</option>
                        <option value="ROOM_SHARE">Room Share</option>
                        <option value="ACTIVITY_BASED">Opt-in Activity</option>
                        <option value="ORGANIZER_PAID">Organizer Covers 100%</option>
                      </select>
                    </div>
                  </div>

                  {/* Participants Multi-Select */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Split Among ({expenseForm.participants.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllParticipants}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-olive)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {expenseForm.participants.length === membersList.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                      {membersList.map((m) => {
                        const isChecked = expenseForm.participants.includes(String(m.id));
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

                  {/* Payment Channel */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Payment Channel
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`category-pill ${expenseForm.paymentMethod === 'CASH' ? 'active' : ''}`}
                        onClick={() => setExpenseForm({ ...expenseForm, paymentMethod: 'CASH' })}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.76rem' }}
                      >
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        className={`category-pill ${expenseForm.paymentMethod === 'UPI' ? 'active' : ''}`}
                        onClick={() => setExpenseForm({ ...expenseForm, paymentMethod: 'UPI' })}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.76rem' }}
                      >
                        <span>UPI / Card</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Scanner */}
                  <button
                    type="button"
                    className="profile-header-icon-btn"
                    onClick={startScanner}
                    style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '0.74rem' }}
                  >
                    <Camera size={14} />
                    <span>Scan Merchant / UPI QR Invoice</span>
                  </button>

                  {cameraOpen && (
                    <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
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

                  <button
                    type="submit"
                    className="success-drawer-dashboard-btn"
                    disabled={isSubmitting}
                    style={{ marginTop: '8px' }}
                  >
                    <span>{isSubmitting ? 'Recording Expense...' : 'Save & Rebalance Ledger'}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. SETTLE UP CONFIRMATION DRAWER ================= */}
        {isSettleUpModalOpen && selectedTransfer && (
          <div className="success-drawer-overlay" onClick={() => setIsSettleUpModalOpen(false)}>
            <div
              className="success-drawer-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="success-drawer-handle-bar">
                <div className="success-drawer-handle" />
                <button
                  type="button"
                  className="success-drawer-close-btn"
                  onClick={() => setIsSettleUpModalOpen(false)}
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              <div className="success-drawer-content" style={{ textAlign: 'left', alignItems: 'stretch' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Record Debt Settlement
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                  Confirm payment from <strong>{selectedTransfer.fromName}</strong> to <strong>{selectedTransfer.toName}</strong>.
                </p>

                <form onSubmit={handleConfirmSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Settlement Amount ({group.currency})
                    </label>
                    <input
                      className="styled-text-input font-bold"
                      required
                      type="number"
                      step="0.01"
                      value={settlementForm.amount}
                      onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.9rem', padding: '9px 12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Payment Method
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`category-pill ${settlementForm.paymentMethod === 'UPI' ? 'active' : ''}`}
                        onClick={() => setSettlementForm({ ...settlementForm, paymentMethod: 'UPI' })}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.76rem' }}
                      >
                        <span>UPI / Online</span>
                      </button>
                      <button
                        type="button"
                        className={`category-pill ${settlementForm.paymentMethod === 'CASH' ? 'active' : ''}`}
                        onClick={() => setSettlementForm({ ...settlementForm, paymentMethod: 'CASH' })}
                        style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.76rem' }}
                      >
                        <span>Cash</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      UTR / Transaction Reference (Optional)
                    </label>
                    <input
                      className="styled-text-input"
                      placeholder="e.g. UPI Ref 394827103"
                      value={settlementForm.reference}
                      onChange={(e) => setSettlementForm({ ...settlementForm, reference: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '8px 12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Remarks Note
                    </label>
                    <input
                      className="styled-text-input"
                      placeholder="e.g. Settle dinner split"
                      value={settlementForm.remarks}
                      onChange={(e) => setSettlementForm({ ...settlementForm, remarks: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '8px 12px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="success-drawer-dashboard-btn"
                    disabled={isSubmitting}
                    style={{ marginTop: '8px' }}
                  >
                    <span>{isSubmitting ? 'Recording Settlement...' : 'Confirm Settlement & Clear Debt'}</span>
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. GROUP MEMBERS MODAL ================= */}
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          groupName={group.name}
          destination={group.destination}
          members={membersList}
          currency={group.currency}
        />
      </div>
    </div>
  );
};
