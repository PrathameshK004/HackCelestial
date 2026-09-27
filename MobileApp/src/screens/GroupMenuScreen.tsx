/**
 * GroupMenuScreen (Trip Ledger & Management)
 * 100% replica of WebApp's GroupMenuPage.tsx
 * 4 Tabs: Expenses, Debts, Balances, Transactions
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DigitalTwinImpactCard } from '../components/group/DigitalTwinImpactCard';
import Svg, { Circle, Line, Path, Defs, Marker, Text as SvgText, G } from 'react-native-svg';
import {
  ArrowLeft,
  Users,
  Plus,
  Receipt,
  IndianRupee,
  Scale,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  Clock,
  ChevronRight,
  Lock,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../api/group.service';
import { ledgerEngine } from '../sync/ledgerEngine';
import { AddExpenseModal } from '../components/group/AddExpenseModal';
import { SyncBanner } from '../components/common/SyncBanner';
import { SettleUpModal } from '../components/group/SettleUpModal';
import { GroupMembersModal } from '../components/group/GroupMembersModal';
import { TripFairnessModal } from '../components/group/TripFairnessModal';

import { SettlementTransfer, Expense, CostSharingModel, Participant, TripFairnessInsight, TripFairnessTransfer } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Debt Graph Visualization Component ─────────────────────────────────────
interface DebtGraphViewProps {
  transfers: SettlementTransfer[];
  members: Participant[];
}

const DebtGraphView: React.FC<DebtGraphViewProps> = ({ transfers, members }) => {
  const svgSize = SCREEN_W - 60;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = svgSize * 0.33;
  const nodeR = 22;

  // Collect unique participant nodes from transfers
  const nodeMap = new Map<string, { id: string; name: string; avatarBg: string }>();
  for (const t of transfers) {
    if (!nodeMap.has(t.fromMemberId)) {
      nodeMap.set(t.fromMemberId, { id: t.fromMemberId, name: t.fromMemberName, avatarBg: t.fromAvatarBg || '#dc2626' });
    }
    if (!nodeMap.has(t.toMemberId)) {
      nodeMap.set(t.toMemberId, { id: t.toMemberId, name: t.toMemberName, avatarBg: t.toAvatarBg || '#059669' });
    }
  }

  const nodes = Array.from(nodeMap.values());
  const n = nodes.length;

  if (n === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ color: colors.slate400, fontSize: 12 }}>No debt graph to display</Text>
      </View>
    );
  }

  // Position nodes in a circle
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[node.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={svgSize} height={n <= 2 ? svgSize * 0.6 : svgSize}>
        <Defs>
          <Marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <Path d="M0,0 L0,6 L8,3 z" fill={colors.primary600} />
          </Marker>
        </Defs>

        {/* Transfer arrows */}
        {transfers.map((t) => {
          const from = positions[t.fromMemberId];
          const to = positions[t.toMemberId];
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;
          const x1 = from.x + ux * (nodeR + 2);
          const y1 = from.y + uy * (nodeR + 2);
          const x2 = to.x - ux * (nodeR + 10);
          const y2 = to.y - uy * (nodeR + 10);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const amtStr = t.amount >= 1000 ? `₹${(t.amount / 1000).toFixed(1)}k` : `₹${t.amount}`;

          return (
            <G key={t.id}>
              <Line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={colors.primary600}
                strokeWidth="2"
                markerEnd="url(#arrow)"
                strokeDasharray="6,3"
                opacity={0.8}
              />
              <Circle cx={mx} cy={my} r={19} fill="#ffffff" stroke={colors.primary200} strokeWidth={1.5} />
              <SvgText x={mx} y={my - 3} fontSize="7.5" fontWeight="800" fill={colors.primary700} textAnchor="middle">
                {amtStr}
              </SvgText>
              <SvgText x={mx} y={my + 7} fontSize="6.5" fill={colors.slate500} textAnchor="middle">
                owes
              </SvgText>
            </G>
          );
        })}

        {/* Member nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const member = members.find((m) => m.id === node.id);
          const balance = member?.balance ?? 0;
          const isDebtor = balance < -0.01;
          const isCreditor = balance > 0.01;
          const ringColor = isDebtor ? '#dc2626' : isCreditor ? '#059669' : colors.slate400;
          const bgColor = node.avatarBg;
          const initial = node.name.charAt(0).toUpperCase();
          const shortName = node.name.length > 8 ? node.name.slice(0, 7) + '…' : node.name;
          const balStr = balance > 0 ? `+₹${Math.abs(balance)}` : balance < 0 ? `-₹${Math.abs(balance)}` : '₹0';

          return (
            <G key={node.id}>
              <Circle cx={pos.x} cy={pos.y} r={nodeR + 3} fill="none" stroke={ringColor} strokeWidth={2} opacity={0.5} />
              <Circle cx={pos.x} cy={pos.y} r={nodeR} fill={bgColor} />
              <SvgText x={pos.x} y={pos.y + 5} fontSize="14" fontWeight="900" fill="#ffffff" textAnchor="middle">
                {initial}
              </SvgText>
              <SvgText x={pos.x} y={pos.y + nodeR + 14} fontSize="9" fontWeight="700" fill={colors.slate800} textAnchor="middle">
                {shortName}
              </SvgText>
              <SvgText x={pos.x} y={pos.y + nodeR + 25} fontSize="8.5" fontWeight="800" fill={ringColor} textAnchor="middle">
                {balStr}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#dc2626' }} />
          <Text style={{ fontSize: 10, color: colors.slate500, fontWeight: '600' }}>Owes money</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#059669' }} />
          <Text style={{ fontSize: 10, color: colors.slate500, fontWeight: '600' }}>Gets paid</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 18, height: 2, backgroundColor: colors.primary600, borderRadius: 1 }} />
          <Text style={{ fontSize: 10, color: colors.slate500, fontWeight: '600' }}>Pays →</Text>
        </View>
      </View>
    </View>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

type LedgerTab = 'expenses' | 'debts' | 'balances' | 'transactions';

interface GroupMenuScreenProps {
  tripId: string;
  onBack: () => void;
}

export const GroupMenuScreen: React.FC<GroupMenuScreenProps> = ({ tripId, onBack }) => {
  const insets = useSafeAreaInsets();
  const { trips, addExpense, deleteExpense, addMember, recordSettlement, refreshTrips } = useTrips();
  const { user } = useAuth();
  const [votingExpenseId, setVotingExpenseId] = useState<string | null>(null);
  const isSyncing = false;

  const [refreshing, setRefreshing] = useState(false);
  const [fairnessInsight, setFairnessInsight] = useState<TripFairnessInsight | null>(null);
  const [isFairnessLoading, setIsFairnessLoading] = useState(false);
  const [isFairnessModalOpen, setIsFairnessModalOpen] = useState(false);

  const trip = trips.find((t) => t.id === tripId) || trips[0];
  const [serverSettlement, setServerSettlement] = useState<any>(null);
  const refreshSettlement = useCallback(async () => {
    try {
      const response = await groupService.getSettlement(tripId);
      setServerSettlement(response?.data || null);
    } catch (error) {
      console.warn('Could not refresh trip settlement:', error);
    }
  }, [tripId]);

  const settlementBalanceMap = useMemo(() => {
    const rows = Array.isArray(serverSettlement?.balances) ? serverSettlement.balances : [];
    return new Map<string, number>(rows.flatMap((row: any) => {
      const memberId = String(row.memberId || row.id || '');
      const netBalance = Number(row.netBalance ?? row.balance);
      return memberId && Number.isFinite(netBalance) ? [[memberId, netBalance]] : [];
    }));
  }, [serverSettlement]);

  const members = useMemo(() => (trip?.members || []).map((member) => {
    const liveBalance = settlementBalanceMap.get(String(member.id));
    return liveBalance === undefined ? member : { ...member, balance: liveBalance };
  }), [trip?.members, settlementBalanceMap]);

  const buildTripFairnessPayload = () => {
    const defaultParticipants = (trip?.members || []).map((m) => String(m.id));
    return {
      tripName: trip?.name || 'Trip',
      participants: (trip?.members || []).map((member) => ({
        id: String(member.id),
        name: member.name || 'Traveler',
      })),
      bookings: (trip?.expenses || []).map((expense) => {
        const splits = Array.isArray(expense.splits) ? expense.splits : null;
        return {
          id: expense.id,
          title: expense.title,
          amount: Number(expense.amount || 0),
          splitModel: expense.splitModel || 'EQUAL',
          participants: splits && splits.length > 0
            ? splits.map((split: any) => ({
                participantId: String(split.participantId || split.memberId || split.userId || split.id || ''),
                amount: Number(split.amount || split.computedAmount || 0)
              }))
            : defaultParticipants,
          payer: String(expense.paidById || expense.paidByName || '')
        };
      }),
      payments: (trip?.settlements || []).map((settlement) => ({
        from: String(settlement.fromMemberId),
        to: String(settlement.toMemberId),
        amount: Number(settlement.amount || 0)
      }))
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshTrips(), refreshSettlement()]);
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadFreshTripData = async () => {
      if (!tripId) return;
      try {
        setServerSettlement(null);
        if (isMounted) {
          setRefreshing(true);
        }
        await Promise.all([refreshTrips(), refreshSettlement()]);
      } catch (err) {
        console.warn('Initial trip refresh error:', err);
      } finally {
        if (isMounted) {
          setRefreshing(false);
        }
      }
    };

    loadFreshTripData();
    return () => {
      isMounted = false;
    };
  }, [tripId, refreshTrips, refreshSettlement]);

  const refreshFairnessInsight = useCallback(async () => {
    if (!trip || !trip.members?.length) return;
    setIsFairnessLoading(true);
    try {
      const res = await groupService.analyzeTripFairness(buildTripFairnessPayload());
      const payload = res?.data || null;
      if (payload && typeof payload.fairnessScore === 'number') {
        setFairnessInsight(payload);
      } else {
        setFairnessInsight(null);
      }
    } catch (error) {
      console.warn('Trip fairness analysis is unavailable:', error);
      setFairnessInsight(null);
    } finally {
      setIsFairnessLoading(false);
    }
  }, [trip?.id, trip?.members, trip?.expenses, trip?.settlements]);

  useEffect(() => {
    refreshFairnessInsight();
  }, [refreshFairnessInsight]);

  const handleSettleFairnessTransfer = (transfer: TripFairnessTransfer) => {
    setIsFairnessModalOpen(false);
    setSettlePayerId(transfer.from);
    setSettleReceiverId(transfer.to);
    setSettleAmount(transfer.amount);
    setIsSettleUpOpen(true);
  };

  const [activeTab, setActiveTab] = useState<LedgerTab>('expenses');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Settle Up preset state
  const [settlePayerId, setSettlePayerId] = useState<string | undefined>(undefined);
  const [settleReceiverId, setSettleReceiverId] = useState<string | undefined>(undefined);
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);

  const financialDataError = Boolean(trip?.settlementError);
  const rawExpenses = trip?.expenses || [];
  const expenses = rawExpenses;
  const settlements = trip?.settlements || [];

  const confirmedMembers = members.filter(
    (m) => m.role === 'Organizer' || m.status === 'ACCEPTED'
  );
  const pendingMembers = members.filter(
    (m) => m.role !== 'Organizer' && (m.status === 'PENDING' || !m.status)
  );
  const declinedMembers = members.filter(
    (m) => m.role !== 'Organizer' && (m.status === 'REJECTED' || m.status === 'DECLINED')
  );

  const isExpenseLocked = members.length > 1 && (pendingMembers.length > 0 || declinedMembers.length > 0 || confirmedMembers.length < members.length);

  const handleAttemptAddExpense = () => {
    if (isExpenseLocked) {
      const pendingCount = pendingMembers.length;
      const declinedCount = declinedMembers.length;
      let reasonText = '';
      if (pendingCount > 0 && declinedCount > 0) {
        reasonText = `${pendingCount} traveler${pendingCount > 1 ? 's' : ''} awaiting invitation acceptance and ${declinedCount} traveler${declinedCount > 1 ? 's' : ''} declined.`;
      } else if (pendingCount > 0) {
        reasonText = `${pendingCount} traveler${pendingCount > 1 ? 's have' : ' has'} not yet accepted the trip invitation.`;
      } else if (declinedCount > 0) {
        reasonText = `${declinedCount} traveler${declinedCount > 1 ? 's have' : ' has'} declined the trip invitation.`;
      } else {
        reasonText = `Unconfirmed group members present in roster.`;
      }

      Alert.alert(
        'Expense Management Locked 🔒',
        `Expense logging and cost distribution are disabled until all invited group members accept their trip invitations.\n\nStatus: ${confirmedMembers.length}/${members.length} Confirmed.\nReason: ${reasonText}\n\nPlease review your roster and share invitation links to complete group setup.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Traveler Roster',
            style: 'default',
            onPress: () => setIsMembersModalOpen(true),
          },
        ]
      );
      return;
    }
    setIsAddExpenseOpen(true);
  };

  // Optimal debts calculation
  const optimalResult = useMemo(() => {
    if (!trip || members.length === 0) return null;
    return ledgerEngine.calculateOptimalSettlements(
      members,
      trip.id,
      trip.currency,
      trip.currencySymbol
    );
  }, [trip, members]);

  // Personal user balance calculation
  const userMember = members.find((m) =>
    m.isUser ||
    (user && m.userId && String(m.userId) === String(user.id)) ||
    (user && m.email && String(m.email).toLowerCase() === String(user.email || user.emailId || '').toLowerCase())
  );
  const userBalance = userMember?.balance ?? trip?.userBalance ?? 0;
  const isUserOwed = userBalance > 0.01;
  const doesUserOwe = userBalance < -0.01;

  const isExpensePayer = (exp: Expense): boolean => {
    if (userMember) {
      if (String(exp.paidById) === String(userMember.id)) return true;
      if (userMember.userId && String(exp.paidById) === String(userMember.userId)) return true;
      if (userMember.name && String(exp.paidByName).trim().toLowerCase() === userMember.name.trim().toLowerCase()) return true;
    }
    if (user) {
      if (String(exp.paidById) === String(user.id)) return true;
      if (user.username && String(exp.paidByName).trim().toLowerCase() === user.username.trim().toLowerCase()) return true;
      if (user.name && String(exp.paidByName).trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    }
    return false;
  };

  const handleCastVote = async (expense: Expense, action: 'APPROVE' | 'DISPUTE') => {
    setVotingExpenseId(expense.id);
    try {
      await groupService.reviewExpenseApproval(trip.id, expense.id, action);
      if (action === 'APPROVE') {
        Alert.alert('✅ Response Recorded', 'Thank you for verifying this expense.');
      } else {
        Alert.alert('⚠️ Feedback Recorded', 'Your dispute response has been submitted.');
      }
      await refreshTrips();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit response. Please try again.');
    } finally {
      setVotingExpenseId(null);
    }
  };

  const handleDeleteExpense = (expId: string, title: string) => {
    Alert.alert('Delete Expense', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(trip.id, expId);
            setExpandedExpenseId(null);
          } catch (err: any) {
            Alert.alert('Cannot Delete', err?.message || 'Only the member who added this expense can delete it.');
          }
        },
      },
    ]);
  };

  const handleOpenSettleTransfer = (t: SettlementTransfer) => {
    setSettlePayerId(t.fromMemberId);
    setSettleReceiverId(t.toMemberId);
    setSettleAmount(t.amount);
    setIsSettleUpOpen(true);
  };

  // ── Smart Back Navigation Handler ─────────────────────────────────────────
  const handleBack = () => {
    // 1. Dismiss open modals
    if (isAddExpenseOpen) {
      setIsAddExpenseOpen(false);
      return;
    }
    if (isSettleUpOpen) {
      setIsSettleUpOpen(false);
      return;
    }
    if (isMembersModalOpen) {
      setIsMembersModalOpen(false);
      return;
    }
    if (isFairnessModalOpen) {
      setIsFairnessModalOpen(false);
      return;
    }
    // 2. Collapse expanded expense card if open
    if (expandedExpenseId) {
      setExpandedExpenseId(null);
      return;
    }
    // 3. If on a sub-tab (debts, balances, transactions), return to expenses tab
    if (activeTab !== 'expenses') {
      setActiveTab('expenses');
      return;
    }
    // 4. Return to main dashboard
    onBack();
  };

  useEffect(() => {
    const onHardwareBack = () => {
      handleBack();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [isAddExpenseOpen, isSettleUpOpen, isMembersModalOpen, isFairnessModalOpen, expandedExpenseId, activeTab, onBack]);

  return (
    <SafeAreaView
      style={[styles.safeContainer, { paddingTop: insets.top }]}
      edges={['left', 'right']}
    >
      <View style={styles.container}>
      <SyncBanner />
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.slate800} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.tripTitle} numberOfLines={1}>
            {trip?.name || 'Trip Ledger'}
          </Text>
          <Text style={styles.tripSubtitle}>
            {trip?.destination} • {confirmedMembers.length}/{members.length} Confirmed
          </Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => handleRefresh()}
            activeOpacity={0.7}
          >
            {isSyncing || refreshing ? (
              <ActivityIndicator size="small" color={colors.primary600} />
            ) : (
              <RefreshCw size={16} color={colors.slate600} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setIsMembersModalOpen(true)}
            activeOpacity={0.7}
          >
            <Users size={16} color={colors.slate700} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >

        {/* Unified Net Balance & Tabular Menu (Full-Width, No Card) */}
        <View style={styles.fullWidthSection}>
          {/* Top: Net Balance Row */}
          <View style={styles.balanceSection}>
            <View style={styles.balanceTextCol}>
              <Text style={styles.balanceLabel}>Your Net Balance</Text>
              <Text
                style={[
                  styles.balanceValue,
                  isUserOwed && styles.balanceValueOwed,
                  doesUserOwe && styles.balanceValueOwes,
                ]}
              >
                {financialDataError
                  ? 'Unable to load balances'
                  : isUserOwed
                  ? `+₹${Math.abs(userBalance).toLocaleString()}`
                  : doesUserOwe
                  ? `-₹${Math.abs(userBalance).toLocaleString()}`
                  : '₹0.00'}
              </Text>
              <Text style={styles.balanceStatusNote}>
                {financialDataError
                  ? 'Unable to calculate settlement. Please try again.'
                  : isUserOwed
                  ? 'You are owed by group travelers'
                  : doesUserOwe
                  ? 'You owe other group travelers'
                  : 'All expenses are fully settled'}
              </Text>
            </View>

            {doesUserOwe && !financialDataError && (
              <TouchableOpacity
                style={styles.calloutSettleBtn}
                onPress={() => {
                  setSettlePayerId(userMember?.id);
                  setSettleReceiverId(undefined);
                  setSettleAmount(undefined);
                  setIsSettleUpOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.calloutSettleText}>Settle Up</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom: Standard Underlined Tabular Menu */}
          <View style={styles.underlinedTabBar}>
            <TouchableOpacity
              style={[styles.underlinedTabItem, activeTab === 'expenses' && styles.underlinedTabItemActive]}
              onPress={() => setActiveTab('expenses')}
              activeOpacity={0.7}
            >
              <Receipt size={14} color={activeTab === 'expenses' ? colors.primary600 : colors.slate500} />
              <Text style={[styles.underlinedTabText, activeTab === 'expenses' && styles.underlinedTabTextActive]}>
                Expenses ({expenses.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.underlinedTabItem, activeTab === 'debts' && styles.underlinedTabItemActive]}
              onPress={() => setActiveTab('debts')}
              activeOpacity={0.7}
            >
              <IndianRupee size={14} color={activeTab === 'debts' ? colors.primary600 : colors.slate500} />
              <Text style={[styles.underlinedTabText, activeTab === 'debts' && styles.underlinedTabTextActive]}>
                Debts ({optimalResult?.transfers.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.underlinedTabItem, activeTab === 'balances' && styles.underlinedTabItemActive]}
              onPress={() => setActiveTab('balances')}
              activeOpacity={0.7}
            >
              <Scale size={14} color={activeTab === 'balances' ? colors.primary600 : colors.slate500} />
              <Text style={[styles.underlinedTabText, activeTab === 'balances' && styles.underlinedTabTextActive]}>
                Balances
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        <DigitalTwinImpactCard tripId={trip.id} />

        {/* Tab Content Area */}
        {/* TripFairness AI Intelligence Card */}
        <TouchableOpacity
          style={styles.fairnessInsightCard}
          onPress={() => setIsFairnessModalOpen(true)}
          activeOpacity={0.88}
        >
          <View style={styles.fairnessHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.fairnessBadge}>
                <ShieldCheck size={14} color={colors.primary700} />
              </View>
              <Text style={styles.fairnessTitle}>TripFairness AI</Text>
              <View style={styles.fairnessLivePill}>
                <Sparkles size={9} color={colors.accentPurple} />
                <Text style={styles.fairnessLiveText}>Live Engine</Text>
              </View>
            </View>
            {isFairnessLoading ? (
              <ActivityIndicator size="small" color={colors.primary600} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={[
                    styles.fairnessScorePill,
                    {
                      backgroundColor:
                        (fairnessInsight?.fairnessScore ?? 100) >= 80
                          ? colors.primary50
                          : (fairnessInsight?.fairnessScore ?? 100) >= 60
                          ? colors.accentAmberLight
                          : colors.accentRoseLight,
                      color:
                        (fairnessInsight?.fairnessScore ?? 100) >= 80
                          ? colors.primary700
                          : (fairnessInsight?.fairnessScore ?? 100) >= 60
                          ? colors.accentAmber
                          : colors.accentRose,
                    },
                  ]}
                >
                  {fairnessInsight?.fairnessScore ?? 100}/100
                </Text>
                <ChevronRight size={14} color={colors.slate400} />
              </View>
            )}
          </View>

          {fairnessInsight ? (
            <>
              <Text style={styles.fairnessSummary}>{fairnessInsight.summary}</Text>
              {fairnessInsight.issues && fairnessInsight.issues.length > 0 && (
                <View style={styles.fairnessIssueWrap}>
                  {fairnessInsight.issues.slice(0, 2).map((issue, index) => (
                    <View key={`${issue}-${index}`} style={styles.fairnessIssueChip}>
                      <AlertTriangle size={11} color={colors.accentAmber} />
                      <Text style={styles.fairnessIssueText} numberOfLines={2}>{issue}</Text>
                    </View>
                  ))}
                </View>
              )}
              {fairnessInsight.settlementStrategy && (
                <View style={styles.fairnessRecommendBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.fairnessRecommendTitle}>{fairnessInsight.settlementStrategy.title}</Text>
                    <Text style={styles.fairnessTapHint}>View Report →</Text>
                  </View>
                  <Text style={styles.fairnessRecommendText} numberOfLines={2}>
                    {fairnessInsight.settlementStrategy.summary}
                  </Text>
                  {fairnessInsight.settlementStrategy.minTransferSet && fairnessInsight.settlementStrategy.minTransferSet.length > 0 && (
                    <View style={styles.fairnessTeaserRow}>
                      <Text style={styles.fairnessTeaserText}>
                        ⚡ {fairnessInsight.settlementStrategy.minTransferSet.length} optimized transfer{fairnessInsight.settlementStrategy.minTransferSet.length > 1 ? 's' : ''} to clear all debts
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.fairnessSummary}>
              {isFairnessLoading ? 'Analyzing trip fairness…' : 'No fairness signal available yet. Add more trip expenses to generate insights.'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.tabContentWrap}>
          {/* TAB 1: EXPENSES */}
        {activeTab === 'expenses' && (
          <View>
              {(trip.packageReservations?.length || trip.restaurantReservations?.length) ? (
                <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
                  <Text style={styles.sectionHeader}>Bookings for this trip</Text>
                  {trip.packageReservations?.map((reservation) => (
                    <View key={reservation.id} style={{ padding: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgCard }}>
                      <Text style={{ color: colors.slate900, fontSize: 14, fontWeight: '800' }}>{reservation.packageName}</Text>
                      <Text style={{ marginTop: 4, color: colors.slate500, fontSize: 12 }}>{reservation.destination} · {reservation.startDate} to {reservation.endDate} · {reservation.guestCount} guests</Text>
                      <Text style={{ marginTop: 5, color: colors.primary700, fontSize: 12, fontWeight: '700' }}>₹{Number(reservation.totalAmount).toLocaleString('en-IN')} · {reservation.status.replaceAll('_', ' ')}</Text>
                    </View>
                  ))}
                  {trip.restaurantReservations?.map((reservation) => (
                    <View key={reservation.id} style={{ padding: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgCard }}>
                      <Text style={{ color: colors.slate900, fontSize: 14, fontWeight: '800' }}>{reservation.restaurantName}</Text>
                      <Text style={{ marginTop: 4, color: colors.slate500, fontSize: 12 }}>{reservation.date} at {String(reservation.startTime).slice(0, 5)} · {reservation.guestCount} guests</Text>
                      <Text style={{ marginTop: 5, color: colors.primary700, fontSize: 12, fontWeight: '700' }}>{reservation.status.replaceAll('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

            {expenses.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Receipt size={40} color={colors.slate300} />
                <Text style={styles.emptyTitle}>No expenses recorded yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add the first expense below to start tracking your group budget.
                </Text>
              </View>
            ) : (
              expenses.map((exp) => {
                const isExpanded = expandedExpenseId === exp.id;
                return (
                  <View key={exp.id} style={styles.expenseCard}>
                    <TouchableOpacity
                      style={styles.expenseHeaderRow}
                      onPress={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.expIconBadge}>
                        <Receipt size={16} color={colors.primary600} />
                      </View>

                      <View style={styles.expDetails}>
                        <Text style={styles.expTitle}>{exp.title}</Text>
                        <Text style={styles.expMeta}>
                          Paid by {exp.paidByName} • {exp.date}
                        </Text>
                        {exp.syncStatus !== 'SYNCED' && (
                          <Text style={[styles.expSyncStatus, exp.syncStatus === 'FAILED' && styles.expSyncFailed]}>
                            {exp.syncStatus === 'FAILED' ? 'Needs attention' : 'Saved on this device • Waiting to sync'}
                          </Text>
                        )}
                      </View>

                      <View style={styles.expAmountCol}>
                        <Text style={styles.expAmount}>
                          ₹{exp.amount.toLocaleString()}
                        </Text>
                        <View style={styles.splitModelBadge}>
                          <Text style={styles.splitModelBadgeText}>
                            {exp.splitModel === 'ORGANIZER_PAID' ? 'Sponsored' : 'Split'}
                          </Text>
                        </View>
                      </View>

                      {isExpanded ? (
                        <ChevronUp size={16} color={colors.slate400} />
                      ) : (
                        <ChevronDown size={16} color={colors.slate400} />
                      )}
                    </TouchableOpacity>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <View style={styles.expDrawer}>
                        <View style={styles.drawerMetaRow}>
                          <Text style={styles.drawerLabel}>Cost-Sharing Model:</Text>
                          <Text style={styles.drawerValue}>{exp.splitModel}</Text>
                        </View>
                        <View style={styles.drawerMetaRow}>
                          <Text style={styles.drawerLabel}>Payment Method:</Text>
                          <Text style={styles.drawerValue}>{exp.paymentMethod || 'CASH'}</Text>
                        </View>

                        {/* Companion Expense Validation (60% Consensus Needed for Official Status) */}
                        {(() => {
                          const isPayer = isExpensePayer(exp);
                          const isFinalized = exp.verificationStatus === 'VERIFIED' || exp.verificationStatus === 'AUTO_VERIFIED';
                          const isPending = exp.verificationStatus === 'PENDING_APPROVAL' || (!isFinalized && !exp.verificationStatus);

                          // Only companions validate pending expenses; approval counts/status are hidden from members
                          if (isPayer || !isPending) {
                            return null;
                          }

                          const approvals = Array.isArray(exp.approvals) ? exp.approvals : [];
                          const currentVote = approvals.find((a: any) =>
                            (userMember && String(a.memberId) === String(userMember.id)) ||
                            (user && String(a.userId) === String(user.id)) ||
                            (user && (a.memberName === user.username || a.memberName === user.name))
                          );

                          return (
                            <View style={styles.drawerValidationBox}>
                              <View style={styles.drawerValidationHeader}>
                                <ShieldCheck size={14} color={colors.primary600} />
                                <Text style={styles.drawerValidationTitle}>VALIDATE EXPENSE</Text>
                              </View>
                              <Text style={styles.drawerValidationSub}>
                                Please confirm if this expense was part of the group trip.
                              </Text>

                              {currentVote ? (
                                <View style={styles.alreadyVotedNotice}>
                                  <CheckCircle2 size={13} color="#059669" />
                                  <Text style={styles.alreadyVotedText}>
                                    Your validation response has been recorded
                                  </Text>
                                </View>
                              ) : (
                                <View style={styles.drawerVoteActions}>
                                  <TouchableOpacity
                                    style={[styles.voteBtn, styles.approveBtn]}
                                    onPress={() => handleCastVote(exp, 'APPROVE')}
                                    disabled={votingExpenseId === exp.id}
                                    activeOpacity={0.8}
                                  >
                                    {votingExpenseId === exp.id ? (
                                      <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                      <>
                                        <ThumbsUp size={13} color="#ffffff" />
                                        <Text style={styles.voteBtnText}>Approve</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[styles.voteBtn, styles.disputeBtn]}
                                    onPress={() => handleCastVote(exp, 'DISPUTE')}
                                    disabled={votingExpenseId === exp.id}
                                    activeOpacity={0.8}
                                  >
                                    <ThumbsDown size={13} color="#dc2626" />
                                    <Text style={styles.disputeBtnText}>Dispute</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })()}

                        {/* Cost Split Breakdown list if present */}
                        {exp.splits && exp.splits.length > 0 && (
                          <View style={styles.splitBreakdownBox}>
                            <Text style={styles.splitBreakdownTitle}>Cost Splits:</Text>
                            <View style={styles.splitChipsWrap}>
                              {exp.splits.map((s: any, idx: number) => (
                                <View key={idx} style={styles.splitChip}>
                                  <Text style={styles.splitChipText}>
                                    {s.memberName || 'Member'}: ₹{Number(s.computedAmount || s.shareAmount || 0).toFixed(0)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* Delete Expense Button - ONLY for the user who added that expense */}
                        {isExpensePayer(exp) && (
                          <TouchableOpacity
                            style={styles.deleteExpBtn}
                            onPress={() => handleDeleteExpense(exp.id, exp.title)}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={13} color={colors.accentRose} />
                            <Text style={styles.deleteExpBtnText}>Delete Expense</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: DEBTS (Smart Settlement Optimizer + Graph) */}
        {activeTab === 'debts' && financialDataError && (
          <View style={styles.emptyWrap}>
            <AlertTriangle size={40} color={colors.accentRose} />
            <Text style={styles.emptyTitle}>Unable to load balances</Text>
            <Text style={styles.emptySubtitle}>Settlement data could not be calculated. Pull to refresh and try again.</Text>
          </View>
        )}

        {activeTab === 'debts' && !financialDataError && optimalResult && (
          <View>
            {/* Optimizer Stats Header */}
            <View style={styles.optimizerHeaderBox}>
              <View style={styles.optHeaderRow}>
                <TrendingUp size={16} color={colors.primary600} />
                <Text style={styles.optTitle}>Smart Debt Minimization</Text>
              </View>
              {optimalResult.transfers.length > 0 ? (
                <Text style={styles.optSubtitle}>
                  Optimized to {optimalResult.optimizedTxCount} transfer{optimalResult.optimizedTxCount !== 1 ? 's' : ''} • Total: ₹{optimalResult.totalVolume.toLocaleString()}
                </Text>
              ) : (
                <Text style={styles.optSubtitle}>All balances are fully settled ✓</Text>
              )}

              {/* Stats Row */}
              {optimalResult.transfers.length > 0 && (
                <View style={styles.optStatsRow}>
                  <View style={styles.optStatChip}>
                    <Text style={styles.optStatValue}>{optimalResult.optimizedTxCount}</Text>
                    <Text style={styles.optStatLabel}>Transfers</Text>
                  </View>
                  <View style={styles.optStatChip}>
                    <Text style={styles.optStatValue}>₹{optimalResult.totalVolume.toLocaleString()}</Text>
                    <Text style={styles.optStatLabel}>Total Owed</Text>
                  </View>
                  <View style={styles.optStatChip}>
                    <Text style={styles.optStatValue}>
                      {members.filter((m) => m.balance < -0.01).length}
                    </Text>
                    <Text style={styles.optStatLabel}>Debtors</Text>
                  </View>
                  <View style={styles.optStatChip}>
                    <Text style={styles.optStatValue}>
                      {members.filter((m) => m.balance > 0.01).length}
                    </Text>
                    <Text style={styles.optStatLabel}>Creditors</Text>
                  </View>
                </View>
              )}
            </View>

            {optimalResult.transfers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <CheckCircle2 size={40} color={colors.primary500} />
                <Text style={styles.emptyTitle}>Group is completely settled!</Text>
                <Text style={styles.emptySubtitle}>No outstanding balances among travelers.</Text>
              </View>
            ) : (
              <>
                {/* ── Debt Graph Visualization ── */}
                <View style={styles.graphSection}>
                  <Text style={styles.graphSectionTitle}>WHO OWES WHOM</Text>
                  <DebtGraphView
                    transfers={optimalResult.transfers}
                    members={members}
                  />
                </View>

                {/* ── Debt List View ── */}
                <Text style={styles.debtListHeading}>Settlement Instructions</Text>
                {optimalResult.transfers.map((t, idx) => {
                  const fromMember = members.find((m) => m.id === t.fromMemberId);
                  const toMember = members.find((m) => m.id === t.toMemberId);
                  const isUserDebtor = fromMember?.isUser;
                  const isUserCreditor = toMember?.isUser;
                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.debtCard,
                        isUserDebtor && styles.debtCardUserOwes,
                        isUserCreditor && styles.debtCardUserOwed,
                      ]}
                    >
                      {/* Index Badge */}
                      <View style={styles.debtIndexBadge}>
                        <Text style={styles.debtIndexText}>#{idx + 1}</Text>
                      </View>

                      {/* Payer Avatar + Name */}
                      <View style={styles.debtPartyRow}>
                        <View style={styles.debtParty}>
                          <View style={[styles.debtAvatar, { backgroundColor: fromMember?.avatarBg || '#dc2626' }]}>
                            <Text style={styles.debtAvatarText}>
                              {t.fromMemberName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.debtPartyInfo}>
                            <Text style={styles.debtPartyName}>
                              {t.fromMemberName}{isUserDebtor ? ' (You)' : ''}
                            </Text>
                            <View style={styles.debtOwesTag}>
                              <Text style={styles.debtOwesTagText}>OWES</Text>
                            </View>
                          </View>
                        </View>

                        {/* Arrow + Amount */}
                        <View style={styles.debtArrowCol}>
                          <Text style={styles.debtAmountCenter}>₹{t.amount.toLocaleString()}</Text>
                          <ArrowRight size={18} color={colors.primary600} />
                        </View>

                        {/* Receiver Avatar + Name */}
                        <View style={styles.debtParty}>
                          <View style={[styles.debtAvatar, { backgroundColor: toMember?.avatarBg || '#059669' }]}>
                            <Text style={styles.debtAvatarText}>
                              {t.toMemberName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.debtPartyInfo}>
                            <Text style={styles.debtPartyName}>
                              {t.toMemberName}{isUserCreditor ? ' (You)' : ''}
                            </Text>
                            <View style={styles.debtOwedTag}>
                              <Text style={styles.debtOwedTagText}>GETS PAID</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Context label */}
                      {(isUserDebtor || isUserCreditor) && (
                        <View style={[
                          styles.debtUserHighlight,
                          isUserDebtor ? styles.debtUserHighlightOwes : styles.debtUserHighlightOwed,
                        ]}>
                          <Text style={styles.debtUserHighlightText}>
                            {isUserDebtor
                              ? `You need to pay ₹${t.amount.toLocaleString()} to ${t.toMemberName}`
                              : `${t.fromMemberName} needs to pay you ₹${t.amount.toLocaleString()}`}
                          </Text>
                        </View>
                      )}

                      {/* Action Button */}
                      {isUserDebtor && (
                        <View style={styles.debtActions}>
                        <TouchableOpacity
                          style={styles.debtUpiBtn}
                          onPress={() => handleOpenSettleTransfer(t)}
                          activeOpacity={0.8}
                        >
                          <Smartphone size={13} color="#ffffff" />
                          <Text style={styles.debtUpiBtnText}>Pay / Settle</Text>
                        </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* TAB 3: BALANCES TABLE */}
        {activeTab === 'balances' && financialDataError && (
          <View style={styles.emptyWrap}>
            <AlertTriangle size={40} color={colors.accentRose} />
            <Text style={styles.emptyTitle}>Unable to load balances</Text>
            <Text style={styles.emptySubtitle}>Settlement data could not be calculated. Pull to refresh and try again.</Text>
          </View>
        )}

        {activeTab === 'balances' && !financialDataError && (
          <View style={styles.balancesCard}>
            <View style={styles.balancesCardHeader}>
              <Text style={styles.balancesCardTitle}>Member Balance Breakdown</Text>
              <Text style={styles.balancesCardSub}>{confirmedMembers.length} active in ledger</Text>
            </View>
            {members.map((m) => {
              const isConfirmed = (m.status || 'ACCEPTED') === 'ACCEPTED' || m.role === 'Organizer';
              return (
                <View key={m.id} style={styles.balanceMemberRow}>
                  <View style={[styles.avatarMini, { backgroundColor: m.avatarBg }]}>
                    <Text style={styles.avatarMiniText}>{m.name.charAt(0)}</Text>
                  </View>

                  <View style={styles.memberInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberRowName}>
                        {m.name} {m.isUser ? '(You)' : ''}
                      </Text>
                      <View style={isConfirmed ? styles.confirmedSmallPill : styles.pendingSmallPill}>
                        <Text style={isConfirmed ? styles.confirmedSmallPillText : styles.pendingSmallPillText}>
                          {isConfirmed ? 'Confirmed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.memberRowRole}>
                      {m.role} • {isConfirmed ? 'Active in Ledger' : 'Pending'}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.memberNetBalance,
                      isConfirmed && m.balance > 0 && styles.memberNetBalanceOwed,
                      isConfirmed && m.balance < 0 && styles.memberNetBalanceOwes,
                      !isConfirmed && { color: '#b45309', fontSize: 12.5, fontWeight: '700' }
                    ]}
                  >
                    {isConfirmed
                      ? m.balance > 0
                        ? `+₹${m.balance.toLocaleString()}`
                        : m.balance < 0
                        ? `-₹${Math.abs(m.balance).toLocaleString()}`
                        : '₹0'
                      : 'Pending'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 4: AUDIT LOG */}
        {activeTab === 'transactions' && (
          <View>
            <Text style={styles.sectionHeader}>Settlement Transactions Log</Text>
            {settlements.length === 0 ? (
              <View style={styles.emptyWrap}>
                <History size={36} color={colors.slate300} />
                <Text style={styles.emptyTitle}>No settlements recorded yet</Text>
              </View>
            ) : (
              settlements.map((s) => (
                <View key={s.id} style={styles.auditRow}>
                  <View style={styles.auditIcon}>
                    <CheckCircle2 size={16} color={colors.primary600} />
                  </View>
                  <View style={styles.auditMain}>
                    <Text style={styles.auditTitle}>
                      {s.fromMemberName} paid {s.toMemberName}
                    </Text>
                    <Text style={styles.auditSub}>
                      {s.remarks || 'Settled debt'} • {s.paymentMethod || 'UPI'}
                    </Text>
                  </View>
                  <Text style={styles.auditAmount}>₹{s.amount.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        )}
        </View>

        <View style={{ height: 54 + insets.bottom }} />
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.floatingActionBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={[styles.primaryAddExpenseBtn, isExpenseLocked && { backgroundColor: '#475569' }]}
          onPress={handleAttemptAddExpense}
          activeOpacity={0.85}
        >
          {isExpenseLocked ? (
            <Lock size={16} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <Plus size={18} color="#ffffff" strokeWidth={2.6} />
          )}
          <Text style={styles.primaryAddExpenseText}>
            {isExpenseLocked ? 'Expenses Locked 🔒' : 'Add Expense'}
          </Text>
        </TouchableOpacity>

        {doesUserOwe && !financialDataError && (
          <TouchableOpacity
            style={styles.secondarySettleBtn}
            onPress={() => {
              setSettlePayerId(userMember?.id);
              setSettleReceiverId(undefined);
              setSettleAmount(undefined);
              setIsSettleUpOpen(true);
            }}
            activeOpacity={0.85}
          >
            <IndianRupee size={17} color={colors.primary700} strokeWidth={2.4} />
            <Text style={styles.secondarySettleText}>Settle Up</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <AddExpenseModal
        visible={isAddExpenseOpen}
        tripId={trip.id}
        members={members}
        onClose={() => setIsAddExpenseOpen(false)}
        onSubmit={async (data) => {
          await addExpense(trip.id, data);
        }}
      />

      <SettleUpModal
        visible={isSettleUpOpen}
        tripId={trip.id}
        tripName={trip.name}
        members={members}
        initialPayerId={settlePayerId}
        initialReceiverId={settleReceiverId}
        initialAmount={settleAmount}
        onClose={() => setIsSettleUpOpen(false)}
        onConfirmSettlement={async (data) => {
          await recordSettlement(trip.id, data);
        }}
      />

      <GroupMembersModal
        visible={isMembersModalOpen}
        tripName={trip.name}
        inviteCode={trip.inviteCode}
        createdBy={trip?.createdBy}
        members={members}
        onClose={() => setIsMembersModalOpen(false)}
        onAddMember={async (name, email) => {
          await addMember(trip.id, { name, email, role: 'Traveler' });
        }}
      />

      <TripFairnessModal
        visible={isFairnessModalOpen}
        onClose={() => setIsFairnessModalOpen(false)}
        insight={fairnessInsight}
        isLoading={isFairnessLoading}
        onRefresh={refreshFairnessInsight}
        onSettleTransfer={handleSettleFairnessTransfer}
      />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  navBar: {
    height: 64,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate900,
  },
  tripSubtitle: {
    fontSize: 11,
    color: colors.slate500,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 0,
  },
  fullWidthSection: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: 16,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  balanceTextCol: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.slate800,
    marginVertical: 2,
  },
  balanceValueOwed: {
    color: colors.primary600,
  },
  balanceValueOwes: {
    color: '#92400e',
  },
  balanceStatusNote: {
    fontSize: 11,
    color: colors.slate500,
  },
  calloutSettleBtn: {
    backgroundColor: colors.primary600,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  calloutSettleText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  underlinedTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20,
  },
  underlinedTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    gap: 5,
  },
  underlinedTabItemActive: {
    borderBottomColor: colors.primary600,
  },
  underlinedTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate500,
  },
  underlinedTabTextActive: {
    color: colors.primary600,
    fontWeight: '700',
  },
  fairnessInsightCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    ...shadows.sm,
  },
  fairnessHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fairnessBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fairnessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate900,
  },
  fairnessScorePill: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary700,
    backgroundColor: colors.primary50,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fairnessSummary: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.slate600,
  },
  fairnessIssueWrap: {
    marginTop: 10,
    gap: 6,
  },
  fairnessIssueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fairnessIssueText: {
    fontSize: 10.5,
    color: colors.slate700,
    flex: 1,
  },
  fairnessRecommendBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 10,
  },
  fairnessRecommendTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.slate500,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fairnessRecommendText: {
    fontSize: 11.5,
    color: colors.slate700,
    lineHeight: 18,
  },
  fairnessMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  fairnessMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  fairnessMetaValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary700,
  },
  fairnessLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentPurpleLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  fairnessLiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accentPurple,
  },
  fairnessTapHint: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary600,
  },
  fairnessTeaserRow: {
    marginTop: 6,
    backgroundColor: colors.primary50,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  fairnessTeaserText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary900,
  },
  tabContentWrap: {
    paddingHorizontal: 16,
  },
  expenseCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadows.sm,
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  expIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expDetails: {
    flex: 1,
  },
  expTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  expMeta: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  expSyncStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accentAmber,
    marginTop: 3,
  },
  expSyncFailed: {
    color: colors.accentRose,
  },
  expAmountCol: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  expAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.slate900,
  },
  splitModelBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: 2,
  },
  splitModelBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.slate600,
  },
  expDrawer: {
    padding: 14,
    backgroundColor: colors.slate50,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    gap: 6,
  },
  drawerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawerLabel: {
    fontSize: 11,
    color: colors.slate500,
  },
  drawerValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate800,
  },
  deleteExpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    paddingVertical: 7,
    borderRadius: radii.sm,
    gap: 6,
    marginTop: 8,
  },
  deleteExpBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.accentRose,
  },
  drawerValidationBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  drawerValidationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  drawerValidationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate700,
    letterSpacing: 0.5,
  },
  drawerValidationSub: {
    fontSize: 11,
    color: colors.slate500,
    marginBottom: 6,
  },
  alreadyVotedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.slate50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  alreadyVotedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate700,
  },
  drawerVoteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.md,
    gap: 5,
  },
  approveBtn: {
    backgroundColor: colors.primary600,
  },
  disputeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  voteBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  disputeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  splitBreakdownBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  splitBreakdownTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.slate500,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  splitChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  splitChip: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  splitChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.slate700,
  },
  optimizerHeaderBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 14,
    ...shadows.sm,
  },
  optHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  optTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate900,
  },
  optSubtitle: {
    fontSize: 11.5,
    color: colors.slate500,
    marginTop: 3,
    marginBottom: 10,
  },
  optStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  optStatChip: {
    flex: 1,
    backgroundColor: colors.slate100,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  optStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary700,
  },
  optStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.slate500,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Graph section
  graphSection: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 14,
    ...shadows.sm,
  },
  graphSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  debtListHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  // New Debt Cards
  debtCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    ...shadows.sm,
    position: 'relative',
  },
  debtCardUserOwes: {
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
  },
  debtCardUserOwed: {
    borderColor: '#6ee7b7',
    backgroundColor: '#ffffff',
  },
  debtIndexBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: colors.slate100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  debtIndexText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.slate500,
  },
  debtPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  debtParty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debtAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtAvatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  debtPartyInfo: {
    flex: 1,
  },
  debtPartyName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  debtOwesTag: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  debtOwesTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  debtOwedTag: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  debtOwedTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  debtArrowCol: {
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  debtAmountCenter: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary700,
  },
  debtUserHighlight: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  debtUserHighlightOwes: {
    backgroundColor: '#fef2f2',
  },
  debtUserHighlightOwed: {
    backgroundColor: '#ecfdf5',
  },
  debtUserHighlightText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.slate700,
  },
  debtActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 10,
  },
  debtUpiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 9,
    borderRadius: radii.sm,
    gap: 6,
  },
  debtUpiBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  balancesCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    ...shadows.sm,
  },
  balancesCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  balanceMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    gap: 10,
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  memberInfoCol: {
    flex: 1,
  },
  memberRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate900,
  },
  memberRowRole: {
    fontSize: 11,
    color: colors.slate500,
  },
  memberNetBalance: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate700,
  },
  memberNetBalanceOwed: {
    color: colors.primary700,
  },
  memberNetBalanceOwes: {
    color: '#92400e',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 8,
    gap: 10,
  },
  auditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditMain: {
    flex: 1,
  },
  auditTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate800,
  },
  auditSub: {
    fontSize: 10.5,
    color: colors.slate500,
    marginTop: 1,
  },
  auditAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate900,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate700,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: 'center',
    maxWidth: 260,
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    ...shadows.lg,
  },
  primaryAddExpenseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderRadius: radii.md,
    paddingVertical: 12,
    gap: 8,
    ...shadows.sm,
  },
  primaryAddExpenseText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  secondarySettleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingVertical: 12,
    gap: 8,
  },
  secondarySettleText: {
    color: colors.primary700,
    fontSize: 13.5,
    fontWeight: '800',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  balancesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  balancesCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  confirmedSmallPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  confirmedSmallPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  pendingSmallPill: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pendingSmallPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#b45309',
  },
});
