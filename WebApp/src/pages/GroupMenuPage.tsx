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
  Smartphone,
  Trash2,
  Users,
  X,
  TrendingUp,
  Utensils,
  BedDouble,
  Car,
  Ticket,
  ShoppingBag,
  CircleHelp
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import { groupService } from '../services/group.service';
import { useRealtimePoller } from '../hooks/useRealtimePoller';
import { GroupSummary, SettlementData, SettlementExpense, SettlementTransfer, Traveler } from '../types/group';
import { GroupMembersModal } from '../components/group/GroupMembersModal';

type LedgerTab = 'expenses' | 'debts' | 'transactions' | 'balances';

const isAcceptedMember = (member: Traveler) => {
  return String(member.status || 'ACCEPTED').toUpperCase() === 'ACCEPTED' || String(member.role).toLowerCase() === 'organizer';
};

const isPendingMember = (member: Traveler) => {
  return String(member.status || '').toUpperCase() === 'PENDING' && String(member.role).toLowerCase() !== 'organizer';
};

const getTransferEndpoint = (transfer: SettlementTransfer, side: 'from' | 'to') => {
  const value = transfer[side];
  const memberId = side === 'from' ? transfer.fromMemberId : transfer.toMemberId;
  const name = side === 'from' ? transfer.fromName : transfer.toName;
  return {
    id: String(memberId || (typeof value === 'string' ? value : value?.id) || ''),
    name: name || (typeof value === 'string' ? value : value?.name) || 'Traveler',
    avatarBg: typeof value === 'object' ? value?.avatarBg : undefined
  };
};

interface DebtGraphViewProps {
  transfers: SettlementTransfer[];
  members: SettlementData['members'];
  currency: string;
}

const DebtGraphView: React.FC<DebtGraphViewProps> = ({ transfers, members, currency }) => {
  const nodesById = new Map<string, { id: string; name: string; avatarBg: string }>();
  transfers.forEach((transfer) => {
    (['from', 'to'] as const).forEach((side) => {
      const endpoint = getTransferEndpoint(transfer, side);
      if (!endpoint.id || nodesById.has(endpoint.id)) return;
      const member = members.find((candidate) => String(candidate.id) === endpoint.id);
      nodesById.set(endpoint.id, {
        id: endpoint.id,
        name: member?.name || endpoint.name,
        avatarBg: member?.avatarBg || endpoint.avatarBg || (side === 'from' ? '#dc2626' : '#059669')
      });
    });
  });

  const nodes = Array.from(nodesById.values());
  if (nodes.length === 0) return null;

  const width = 360;
  const height = 340;
  const centerX = width / 2;
  const centerY = 148;
  const radius = Math.min(108, 96 + nodes.length * 2);
  const nodeRadius = 21;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  });
  const currencyPrefix = currency === 'INR' ? '₹' : `${currency} `;

  return (
    <div className="group-debt-graph-wrap">
      <svg className="group-debt-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Graph showing who owes whom">
        <defs>
          <marker id="group-debt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#059669" />
          </marker>
        </defs>
        {transfers.map((transfer, index) => {
          const from = positions.get(getTransferEndpoint(transfer, 'from').id);
          const to = positions.get(getTransferEndpoint(transfer, 'to').id);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const distance = Math.hypot(dx, dy) || 1;
          const unitX = dx / distance;
          const unitY = dy / distance;
          const startX = from.x + unitX * (nodeRadius + 3);
          const startY = from.y + unitY * (nodeRadius + 3);
          const endX = to.x - unitX * (nodeRadius + 8);
          const endY = to.y - unitY * (nodeRadius + 8);
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          const amount = Number(transfer.amount) || 0;
          const amountLabel = amount >= 1000 ? `${currencyPrefix}${(amount / 1000).toFixed(1)}k` : `${currencyPrefix}${amount.toFixed(0)}`;

          return (
            <g key={transfer.id || index}>
              <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#059669" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#group-debt-arrow)" opacity="0.8" />
              <rect x={midX - 29} y={midY - 14} width="58" height="28" rx="9" fill="#fff" stroke="#a7f3d0" />
              <text x={midX} y={midY - 2} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#047857">{amountLabel}</text>
              <text x={midX} y={midY + 9} textAnchor="middle" fontSize="6.5" fill="#64748b">owes</text>
            </g>
          );
        })}
        {nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const member = members.find((candidate) => String(candidate.id) === node.id);
          const balance = Number(member?.netBalance) || 0;
          const balanceColor = balance < -0.01 ? '#dc2626' : balance > 0.01 ? '#059669' : '#64748b';
          const shortName = node.name.length > 10 ? `${node.name.slice(0, 9)}…` : node.name;
          const balanceLabel = balance > 0.01 ? `+${currencyPrefix}${Math.abs(balance).toFixed(0)}` : balance < -0.01 ? `-${currencyPrefix}${Math.abs(balance).toFixed(0)}` : `${currencyPrefix}0`;
          return (
            <g key={node.id}>
              <circle cx={position.x} cy={position.y} r={nodeRadius + 3} fill="none" stroke={balanceColor} strokeWidth="2" opacity="0.5" />
              <circle cx={position.x} cy={position.y} r={nodeRadius} fill={node.avatarBg} />
              <text x={position.x} y={position.y + 5} textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">{node.name.charAt(0).toUpperCase()}</text>
              <text x={position.x} y={position.y + nodeRadius + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">{shortName}</text>
              <text x={position.x} y={position.y + nodeRadius + 29} textAnchor="middle" fontSize="8" fontWeight="800" fill={balanceColor}>{balanceLabel}</text>
            </g>
          );
        })}
      </svg>
      <div className="group-debt-graph-legend">
        <span><i className="owes" />Owes money</span>
        <span><i className="gets-paid" />Gets paid</span>
        <span><i className="pays" />Pays →</span>
      </div>
    </div>
  );
};

const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'Food', label: 'Food', Icon: Utensils },
  { value: 'Lodging', label: 'Stay', Icon: BedDouble },
  { value: 'Transport', label: 'Transport', Icon: Car },
  { value: 'Activities', label: 'Activities', Icon: Ticket },
  { value: 'Groceries', label: 'Supplies', Icon: ShoppingBag },
  { value: 'Other', label: 'Other', Icon: CircleHelp }
] as const;

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
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<LedgerTab>(initialMenu);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(initialSettlement || null);
  const [groupMembers, setGroupMembers] = useState<Traveler[]>(group.members || []);
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
  const [settlementToMemberId, setSettlementToMemberId] = useState('');

  // UI Toast & State
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Scanner State
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const isSettled = group.status === 'SETTLED' || settlementData?.groupStatus === 'SETTLED';
  const acceptedMembers = groupMembers.filter(isAcceptedMember);
  const pendingMembers = groupMembers.filter(isPendingMember);
  const loggedInMember = groupMembers.find((member) => {
    const currentUserId = user?.userId || user?.id;
    const hasMatchingId = currentUserId && member.userId && String(currentUserId) === String(member.userId);
    const currentEmail = user?.emailId || user?.email;
    const hasMatchingEmail = currentEmail && member.email && currentEmail.trim().toLowerCase() === member.email.trim().toLowerCase();
    return Boolean(hasMatchingId || hasMatchingEmail);
  });
  const payerMember = loggedInMember && isAcceptedMember(loggedInMember) ? loggedInMember : null;
  const payerDisplayName = loggedInMember?.name || user?.username || user?.name || user?.emailId || user?.email || 'Current user';
  const payerGroupStatus = payerMember
    ? 'Accepted'
    : loggedInMember
      ? String(loggedInMember.status || 'Pending').toLowerCase() === 'rejected'
        ? 'Declined'
        : String(loggedInMember.status || 'Pending').toLowerCase() === 'declined'
          ? 'Declined'
          : 'Pending'
      : 'Not in this group';

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

  useEffect(() => {
    let isCurrentGroup = true;
    setGroupMembers(group.members || []);
    groupService.getGroupById(group.id)
      .then(({ data }) => {
        if (isCurrentGroup && Array.isArray(data.members)) setGroupMembers(data.members);
      })
      .catch((err) => console.warn('Failed to load group member statuses:', err));

    return () => {
      isCurrentGroup = false;
    };
  }, [group.id]);

  // Real-time Database Status Sync (3s interval, tab focus, mutation events)
  useRealtimePoller(() => {
    loadSettlement(true);
  }, { intervalMs: 3000 });

  // Cleanup QR Scanner on unmount
  useEffect(() => () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
  }, []);

  // Initialize participants from the group roster, whose status is invitation acceptance.
  useEffect(() => {
    if (groupMembers.length > 0) {
      const acceptedIds = groupMembers
        .filter(isAcceptedMember)
        .map((m: any) => String(m.id));
      setExpenseForm((prev) => ({
        ...prev,
        participants: prev.participants.length > 0
          ? prev.participants.filter((p) => acceptedIds.includes(p))
          : acceptedIds,
        paidByMemberId: payerMember ? String(payerMember.id) : ''
      }));
    }
  }, [groupMembers, user?.userId, user?.id, user?.emailId, user?.email]);

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

  // Select all / none (confirmed members only)
  const toggleAllParticipants = () => {
    if (groupMembers.length === 0) return;
    const acceptedIds = groupMembers
      .filter(isAcceptedMember)
      .map((m) => String(m.id));
    setExpenseForm((prev) => ({
      ...prev,
      participants: prev.participants.length === acceptedIds.length ? [] : acceptedIds
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
    if (!payerMember) {
      setToastMessage('Your account must be an accepted group member to record this purchase.');
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
        paidByMemberId: String(payerMember.id),
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
        paidByMemberId: payerMember ? String(payerMember.id) : '',
        participants: acceptedMembers.map((member) => String(member.id)),
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
    const initialPayee = getTransferEndpoint(tx, 'to');
    const payee = settlementData?.members.find((m) => String(m.id) === initialPayee.id);
    const firstCreditor = settlementData?.members.find((member) =>
      String(member.id) !== getTransferEndpoint(tx, 'from').id && Number(member.netBalance) > 0.01
    );
    setSettlementToMemberId(String(payee?.id || initialPayee.id || firstCreditor?.id || ''));
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
    const payerId = getTransferEndpoint(selectedTransfer, 'from').id;
    const payeeId = settlementToMemberId || getTransferEndpoint(selectedTransfer, 'to').id;
    if (!payeeId || !payerId) return;
    if (payeeId === payerId) {
      setToastMessage('Choose a different receiver for this settlement.');
      return;
    }

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
      setSettlementToMemberId('');
      setToastMessage('Settlement payment recorded successfully.');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to record settlement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const launchSettlementUpi = () => {
    if (!selectedTransfer) return;
    const payee = settlementData?.members.find((member) => String(member.id) === settlementToMemberId);
    if (!payee) return;
    const upiId = payee.upiId || `${payee.name.toLowerCase().replace(/\s+/g, '')}@okaxis`;
    const params = new URLSearchParams({
      pa: upiId,
      pn: payee.name,
      am: Number(settlementForm.amount || selectedTransfer.amount).toFixed(2),
      cu: group.currency,
      tn: `Settlement for ${group.name}`
    });
    const link = document.createElement('a');
    link.href = `upi://pay?${params.toString()}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
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
  const debtTotalVolume = transfersList.reduce((total, transfer) => total + (Number(transfer.amount) || 0), 0);
  const debtorsCount = membersList.filter((member) => Number(member.netBalance) < -0.01).length;
  const creditorsCount = membersList.filter((member) => Number(member.netBalance) > 0.01).length;
  const settlementPayer = selectedTransfer ? getTransferEndpoint(selectedTransfer, 'from') : null;
  const settlementReceiverId = settlementToMemberId || (selectedTransfer ? getTransferEndpoint(selectedTransfer, 'to').id : '');
  const settlementReceiver = membersList.find((member) => String(member.id) === settlementReceiverId);
  const settlementReceiverUpi = settlementReceiver?.upiId || (settlementReceiver?.name
    ? `${settlementReceiver.name.toLowerCase().replace(/\s+/g, '')}@okaxis`
    : '');
  const settlementAmount = Number(settlementForm.amount || selectedTransfer?.amount || 0);

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
                  ? `+₹${userNetBalance.toFixed(2)}`
                  : userNetBalance < -0.01
                  ? `-₹${Math.abs(userNetBalance).toFixed(2)}`
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

        {/* ================= TAB 2: DEBTS & SMART SETTLEMENT ================= */}
        {!isLoading && activeTab === 'debts' && (
          <div className="group-debts-tab">
            <section className="group-debt-optimizer">
              <div className="group-debt-optimizer-heading">
                <TrendingUp size={17} />
                <h3>Smart Debt Minimization</h3>
              </div>
              <p>
                {transfersList.length > 0
                  ? `Optimized to ${transfersList.length} transfer${transfersList.length === 1 ? '' : 's'} · Total: ${group.currency} ${debtTotalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : 'All balances are fully settled.'}
              </p>
              {transfersList.length > 0 && (
                <div className="group-debt-stats">
                  <div><strong>{transfersList.length}</strong><span>Transfers</span></div>
                  <div><strong>{group.currency} {debtTotalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><span>Total Owed</span></div>
                  <div><strong>{debtorsCount}</strong><span>Debtors</span></div>
                  <div><strong>{creditorsCount}</strong><span>Creditors</span></div>
                </div>
              )}
            </section>

            {transfersList.length === 0 ? (
              <div className="group-debt-empty">
                <span className="group-debt-empty-icon"><Check size={24} strokeWidth={3} /></span>
                <h4>Group is completely settled!</h4>
                <p>No outstanding balances among travelers.</p>
              </div>
            ) : (
              <>
                <section className="group-debt-graph-section">
                  <h4>Who Owes Whom</h4>
                  <DebtGraphView transfers={transfersList} members={membersList} currency={group.currency} />
                </section>

                <h4 className="group-debt-list-heading">Settlement Instructions</h4>
                <div className="group-debt-list">
                  {transfersList.map((transfer, index) => {
                    const from = getTransferEndpoint(transfer, 'from');
                    const to = getTransferEndpoint(transfer, 'to');
                    const fromMember = membersList.find((member) => String(member.id) === from.id);
                    const toMember = membersList.find((member) => String(member.id) === to.id);
                    const isUserDebtor = Boolean(
                      (loggedInMember && (from.id === String(loggedInMember.id) || from.id === String(loggedInMember.userId))) ||
                      (user?.userId && (from.id === String(user.userId) || fromMember?.userId === user.userId)) ||
                      (user?.emailId && fromMember?.email?.toLowerCase() === user.emailId.toLowerCase())
                    );
                    const isUserCreditor = Boolean(
                      (loggedInMember && (to.id === String(loggedInMember.id) || to.id === String(loggedInMember.userId))) ||
                      (user?.userId && (to.id === String(user.userId) || toMember?.userId === user.userId)) ||
                      (user?.emailId && toMember?.email?.toLowerCase() === user.emailId.toLowerCase())
                    );
                    const amount = Number(transfer.amount) || 0;
                    const currencyPrefix = group.currency === 'INR' ? '₹' : `${group.currency} `;

                    return (
                      <article
                        key={transfer.id || `${from.id}-${to.id}-${index}`}
                        className={`group-debt-card ${isUserDebtor ? 'user-owes' : ''} ${isUserCreditor ? 'user-owed' : ''}`}
                      >
                        <span className="group-debt-index">#{index + 1}</span>
                        <div className="group-debt-parties">
                          <div className="group-debt-party">
                            <span className="group-debt-avatar debtor" style={{ backgroundColor: fromMember?.avatarBg || from.avatarBg || '#dc2626' }}>
                              {from.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="group-debt-party-info">
                              <strong>{from.name}{isUserDebtor ? ' (You)' : ''}</strong>
                              <small className="owes-tag">OWES</small>
                            </span>
                          </div>

                          <div className="group-debt-direction">
                            <strong>{currencyPrefix}{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                            <ArrowRight size={18} />
                          </div>

                          <div className="group-debt-party receiver">
                            <span className="group-debt-avatar creditor" style={{ backgroundColor: toMember?.avatarBg || to.avatarBg || '#059669' }}>
                              {to.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="group-debt-party-info">
                              <strong>{to.name}{isUserCreditor ? ' (You)' : ''}</strong>
                              <small className="gets-paid-tag">GETS PAID</small>
                            </span>
                          </div>
                        </div>

                        {(isUserDebtor || isUserCreditor) && (
                          <div className={`group-debt-user-note ${isUserDebtor ? 'owes' : 'owed'}`}>
                            {isUserDebtor
                              ? `You need to pay ${currencyPrefix}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} to ${to.name}`
                              : `${from.name} needs to pay you ${currencyPrefix}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                          </div>
                        )}

                        {isUserDebtor && !isSettled && (
                          <div className="group-debt-actions">
                            <button type="button" onClick={() => openSettleUp(transfer, 'UPI')}>
                              <Smartphone size={14} />
                              <span>Pay / Settle via UPI</span>
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
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
                const rosterMember = groupMembers.find((member) => String(member.id) === String(m.id));
                const memberStatus = String(rosterMember?.status || (String(m.role).toLowerCase() === 'organizer' ? 'ACCEPTED' : '')).toUpperCase();
                const isAccepted = memberStatus === 'ACCEPTED' || String(rosterMember?.role || m.role).toLowerCase() === 'organizer';
                const isPending = memberStatus === 'PENDING';
                const isDeclined = memberStatus === 'REJECTED' || memberStatus === 'DECLINED';
                const membershipLabel = isAccepted ? 'Accepted' : isPending ? 'Pending Invite' : isDeclined ? 'Declined' : 'Checking status';

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
                            {isAccepted ? (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                ✓ Accepted
                              </span>
                            ) : isPending ? (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                                ⏳ Pending Invite
                              </span>
                            ) : isDeclined ? (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                                Declined
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-surface-warm)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                                {membershipLabel}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {m.email} • {isAccepted ? 'Active in Ledger' : isPending ? 'No Debt Until Accepted' : isDeclined ? 'Invitation declined' : 'Invitation status unavailable'}
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
              className="success-drawer-sheet expense-entry-sheet"
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

              <div className="success-drawer-content expense-entry-content" style={{ textAlign: 'left', alignItems: 'stretch' }}>
                <div className="expense-mobile-header">
                  <div>
                    <h3>Add Group Expense</h3>
                    <p>Add expense and split costs with group</p>
                  </div>
                </div>

                <form onSubmit={handleSaveExpense} className="expense-mobile-form">
                  <div className="expense-mobile-field">
                    <label className="expense-mobile-label">
                      Expense Title / Description
                    </label>
                    <input
                      className="styled-text-input"
                      required
                      placeholder="e.g., Seafood Dinner at Jimbaran"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="expense-mobile-field">
                    <label className="expense-mobile-label">Amount ({group.currency})</label>
                    <div className="expense-mobile-amount-wrap">
                      <span>{group.currency === 'INR' ? '₹' : group.currency}</span>
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="expense-mobile-field">
                    <label className="expense-mobile-label">Category</label>
                    <div className="expense-mobile-category-row">
                      {EXPENSE_CATEGORY_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          className={`expense-mobile-category-chip ${expenseForm.category === value ? 'active' : ''}`}
                          onClick={() => setExpenseForm({ ...expenseForm, category: value })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="expense-mobile-field">
                    <label className="expense-mobile-label">Cost-Sharing Model</label>
                    <div className="expense-mobile-model-list">
                      {[
                        ['EQUAL', 'Equal Split', 'Divided evenly among all selected travelers'],
                        ['PARTICIPANT_BASED', 'Participant-Based', 'Per-person customized share'],
                        ['ROOM_SHARE', 'Room Share', 'Split based on occupied rooms'],
                        ['ACTIVITY_BASED', 'Activity-Based', 'Split only among opted-in members'],
                        ['ORGANIZER_PAID', 'Organizer Sponsored', 'Organizer covers full cost, 0 debt']
                      ].map(([value, label, description]) => {
                        const isSelected = expenseForm.splitModel === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`expense-mobile-model-card ${isSelected ? 'active' : ''}`}
                            onClick={() => setExpenseForm({ ...expenseForm, splitModel: value as typeof expenseForm.splitModel })}
                            aria-pressed={isSelected}
                          >
                            <span className="expense-mobile-model-copy">
                              <strong>{label}</strong>
                              <span>{description}</span>
                            </span>
                            {isSelected && <Check size={17} aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="expense-mobile-field">
                    <label className="expense-mobile-label">Paid By</label>
                    <div className="expense-mobile-payer" role="status" aria-label="Expense payer, signed-in user">
                      <span>{payerDisplayName} (You)</span>
                      <span className={`expense-mobile-status ${payerMember ? 'accepted' : 'unconfirmed'}`}>
                        {payerGroupStatus}
                      </span>
                    </div>
                  </div>

                  {expenseForm.splitModel !== 'ORGANIZER_PAID' && (
                    <div className="expense-mobile-field">
                      <div className="expense-mobile-section-heading">
                        <label className="expense-mobile-label">
                          Split Among ({expenseForm.participants.length} accepted travelers)
                        </label>
                        <button type="button" onClick={toggleAllParticipants}>
                          {expenseForm.participants.length === acceptedMembers.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="expense-mobile-member-list">
                        {acceptedMembers.map((member) => {
                          const memberId = String(member.id);
                          const isSelected = expenseForm.participants.includes(memberId);
                          const share = Number(expenseForm.amount || 0) / Math.max(expenseForm.participants.length, 1);
                          return (
                            <button
                              key={memberId}
                              type="button"
                              className={`expense-mobile-member-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleParticipant(memberId)}
                              aria-pressed={isSelected}
                            >
                              <span className={`expense-mobile-checkbox ${isSelected ? 'checked' : ''}`} aria-hidden="true">
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </span>
                              <span className="expense-mobile-member-avatar" style={{ backgroundColor: member.avatarBg || '#059669' }}>
                                {(member.name || 'T').charAt(0).toUpperCase()}
                              </span>
                              <span className="expense-mobile-member-name">{member.name}</span>
                              <span className="expense-mobile-status accepted">Accepted</span>
                              <span className="expense-mobile-member-share">
                                {group.currency === 'INR' ? '₹' : `${group.currency} `}{share.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {pendingMembers.length > 0 && (
                        <div className="expense-mobile-pending-note">
                          {pendingMembers.length} traveler{pendingMembers.length === 1 ? '' : 's'} awaiting invitation acceptance; pending members are excluded from this split.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="expense-mobile-preview">
                    <strong>Split Preview</strong>
                    <span>
                      {expenseForm.splitModel === 'ORGANIZER_PAID'
                        ? 'Organizer covers 100% of this expense (0 impact on travelers)'
                        : `Each of the ${expenseForm.participants.length || 1} selected travelers will owe ${group.currency === 'INR' ? '₹' : `${group.currency} `}${(Number(expenseForm.amount || 0) / Math.max(expenseForm.participants.length, 1)).toFixed(2)}`}
                    </span>
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

                  <div className="expense-mobile-footer">
                    <button
                      type="submit"
                      className="success-drawer-dashboard-btn"
                      disabled={isSubmitting}
                    >
                      <span>{isSubmitting ? 'Recording Expense...' : `Add Expense • ${group.currency === 'INR' ? '₹' : `${group.currency} `}${Number(expenseForm.amount || 0).toLocaleString()}`}</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. SETTLE UP CONFIRMATION DRAWER ================= */}
        {isSettleUpModalOpen && selectedTransfer && (
          <div className="success-drawer-overlay" onClick={() => setIsSettleUpModalOpen(false)}>
            <div
              className="success-drawer-sheet settle-up-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settle-up-title"
            >
              <div className="success-drawer-handle-bar">
                <div className="success-drawer-handle" />
                <button
                  type="button"
                  className="success-drawer-close-btn"
                  onClick={() => {
                    setIsSettleUpModalOpen(false);
                    setSettlementToMemberId('');
                  }}
                  aria-label="Close settle up"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              <div className="success-drawer-content settle-up-content">
                <div className="settle-up-heading">
                  <h3 id="settle-up-title">Settle Up</h3>
                  <p>{group.name}</p>
                </div>

                <div className="settle-flow-card">
                  <div className="settle-flow-member">
                    <span className="settle-flow-avatar" style={{ backgroundColor: settlementPayer?.avatarBg || '#059669' }}>
                      {(settlementPayer?.name || 'P').trim().slice(0, 2).toUpperCase()}
                    </span>
                    <strong>{settlementPayer?.name || 'Payer'}</strong>
                    <small>Paying</small>
                  </div>
                  <div className="settle-flow-arrow"><ArrowRight size={17} /></div>
                  <div className="settle-flow-member">
                    <span className="settle-flow-avatar" style={{ backgroundColor: settlementReceiver?.avatarBg || '#0284C7' }}>
                      {(settlementReceiver?.name || 'R').trim().slice(0, 2).toUpperCase()}
                    </span>
                    <strong>{settlementReceiver?.name || 'Receiver'}</strong>
                    <small>Receiving</small>
                  </div>
                </div>

                <div className="settle-up-body">
                  <section className="settle-up-section">
                    <h4>You Are Paying</h4>
                    <div className="settle-locked-payer">
                      <span className="settle-flow-avatar small" style={{ backgroundColor: settlementPayer?.avatarBg || '#059669' }}>
                        {(settlementPayer?.name || 'P').trim().slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{settlementPayer?.name || 'Payer'} (You)</strong>
                    </div>
                  </section>

                  <section className="settle-up-section">
                    <h4>Paying To</h4>
                    <div className="settle-creditor-chips">
                      {membersList
                        .filter((member) => String(member.id) !== settlementPayer?.id && Number(member.netBalance) > 0.01)
                        .map((member) => {
                          const isSelected = String(member.id) === settlementReceiverId;
                          return (
                            <button
                              key={String(member.id)}
                              type="button"
                              className={`settle-creditor-chip ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setSettlementToMemberId(String(member.id));
                                setSettlementForm((previous) => ({
                                  ...previous,
                                  remarks: `Settlement to ${member.name}`
                                }));
                              }}
                              aria-pressed={isSelected}
                            >
                              <span className="settle-chip-avatar" style={{ backgroundColor: member.avatarBg || '#0284C7' }}>
                                {(member.name || 'T').charAt(0).toUpperCase()}
                              </span>
                              {member.name.split(' ')[0]}
                            </button>
                          );
                        })}
                    </div>
                  </section>

                  <section className="settle-up-section">
                    <h4>Amount</h4>
                    <div className="settle-amount-card">
                      <span>{group.currency === 'INR' ? '₹' : group.currency}</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={settlementForm.amount}
                        onChange={(event) => setSettlementForm({ ...settlementForm, amount: event.target.value })}
                        aria-label="Settlement amount"
                      />
                      {settlementAmount > 0 && (
                        <small>{settlementAmount.toLocaleString('en-IN')}</small>
                      )}
                    </div>
                  </section>

                  <div className="settle-vpa-card">
                    <span className="settle-vpa-icon"><Smartphone size={17} /></span>
                    <span className="settle-vpa-info">
                      <small>RECEIVER UPI VPA</small>
                      <strong>{settlementReceiverUpi || 'Select a creditor'}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="settle-launch-upi"
                    onClick={launchSettlementUpi}
                    disabled={!settlementReceiver || settlementAmount <= 0}
                  >
                    <Smartphone size={17} />
                    <span>Pay via UPI App</span>
                  </button>

                  <form onSubmit={handleConfirmSettlement} className="settle-reference-form">
                    <label htmlFor="settle-reference">UTR / Transaction Reference (Optional)</label>
                    <input
                      id="settle-reference"
                      className="styled-text-input"
                      placeholder="Enter payment reference"
                      value={settlementForm.reference}
                      onChange={(event) => setSettlementForm({ ...settlementForm, reference: event.target.value })}
                    />
                    <input
                      type="hidden"
                      value={settlementForm.remarks}
                      readOnly
                    />
                    <button
                      type="submit"
                      className="settle-record-button"
                      disabled={isSubmitting || settlementAmount <= 0 || !settlementReceiver}
                    >
                      <Check size={17} />
                      <span>{isSubmitting ? 'Recording...' : `Mark as Settled · ${group.currency === 'INR' ? '₹' : `${group.currency} `}${settlementAmount.toLocaleString('en-IN')}`}</span>
                    </button>
                  </form>
                </div>
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
          members={groupMembers}
          currency={group.currency}
        />
      </div>
    </div>
  );
};
