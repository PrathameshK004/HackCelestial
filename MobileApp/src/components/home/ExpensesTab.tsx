/**
 * Expenses Tab — Global Financial Stats, Smart Settlement Optimizer & Unified Expense Stream
 * 
 * KEY FEATURE: 60% Group Member Consensus Approval Banner
 * - For every PENDING_APPROVAL expense, group companions see an Approve / Dispute prompt
      <View style={styles.metricsTabsCard}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
 * - AUTO_VERIFIED expenses (bank SMS detected) skip the approval flow entirely
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  NativeModules,
  ActivityIndicator,
} from 'react-native';
import {
  Zap,
  ArrowRight,
  Receipt,
  Smartphone,
  CheckCircle2,
  Share2,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { cardRadius } from '../../theme/theme';
import { useTrips } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { ledgerEngine } from '../../sync/ledgerEngine';
import { SettlementTransfer, Expense } from '../../types';
import { groupService } from '../../api/group.service';
import { socketService } from '../../services/socketService';

interface ExpensesTabProps {
  onOpenSettleModal?: (transfer: SettlementTransfer) => void;
  searchQuery?: string;
  onRefresh?: () => Promise<void> | void;
}

interface ApprovalState {
  [expenseId: string]: {
    loading: boolean;
    voted: 'APPROVE' | 'DISPUTE' | null;
    approveCount: number;
    requiredApprovals: number;
    isFinalized: boolean;
    verificationStatus: string;
  };
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ onOpenSettleModal, searchQuery = '' }) => {
  const { trips, recordSettlement, refreshTrips } = useTrips();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<'expenses' | 'approvals'>('expenses');

  // Track approval UI state per-expense
  const [approvalState, setApprovalState] = useState<ApprovalState>({});

  const q = searchQuery.trim().toLowerCase();

  // Build a flat list of all expenses (across trips) with trip context
  const { totalSpent, youOwe, youAreOwed, allExpenses, allMembers } = useMemo(() => {
    let spent = 0;
    let owe = 0;
    let owed = 0;
    const expensesList: any[] = [];
    const membersList: any[] = [];

    trips.forEach((t) => {
      spent += t.totalSpent || 0;
      if (t.userBalance > 0) owed += t.userBalance;
      if (t.userBalance < 0) owe += Math.abs(t.userBalance);

      if (t.expenses) {
        const seenExpIds = new Set<string>();
        t.expenses.forEach((e) => {
          const eid = String(e.id || '');
          if (!eid || seenExpIds.has(eid)) return;
          seenExpIds.add(eid);
          expensesList.push({ ...e, tripName: t.name, tripId: t.id, currencySymbol: t.currencySymbol });
        });
      }
      if (t.members) {
        t.members.forEach((m) => {
          membersList.push(m);
        });
      }
    });

    return {
      totalSpent: spent,
      youOwe: owe,
      youAreOwed: owed,
      allExpenses: expensesList,
      allMembers: membersList,
    };
  }, [trips]);

  // Primary active trip for smart settlement
  const activeTrip = trips[0];
  const optimalResult = useMemo(() => {
    if (!activeTrip || !activeTrip.members) return null;
    return ledgerEngine.calculateOptimalSettlements(
      activeTrip.members,
      activeTrip.id,
      activeTrip.currency,
      activeTrip.currencySymbol
    );
  }, [activeTrip]);

  // ── Socket.IO: Real-time Approval Updates ──────────────────────────────────
  // Listens for EXPENSE_APPROVAL_UPDATED events and dismisses/updates approval banners
  useEffect(() => {
    const unsub = socketService.on('EXPENSE_APPROVAL_UPDATED', (data: any) => {
      if (!data?.expenseId) return;
      setApprovalState((prev) => ({
        ...prev,
        [data.expenseId]: {
          ...(prev[data.expenseId] || {}),
          loading: false,
          approveCount: data.approveCount ?? (prev[data.expenseId]?.approveCount || 0),
          requiredApprovals: data.requiredApprovals ?? (prev[data.expenseId]?.requiredApprovals || 1),
          isFinalized: Boolean(data.isFinalized),
          verificationStatus: data.verificationStatus || 'PENDING_APPROVAL',
        },
      }));

      if (data.isFinalized && data.verificationStatus === 'VERIFIED') {
        // Refresh to pull finalized expense data from server
        refreshTrips().catch(() => null);
      }
    });

    // Also join each group's socket room so we receive group-scoped events
    trips.forEach((t) => {
      socketService.joinGroup(t.id);
    });

    return () => {
      unsub();
    };
  }, [trips, refreshTrips]);

  // Initialize approval state from loaded expense data
  useEffect(() => {
    const initial: ApprovalState = {};
    allExpenses.forEach((exp: any) => {
      if (exp.verificationStatus === 'PENDING_APPROVAL' && !approvalState[exp.id]) {
        const approveCount = (exp.approvals || []).filter((a: any) => a.action === 'APPROVE').length;
        initial[exp.id] = {
          loading: false,
          voted: null,
          approveCount,
          requiredApprovals: exp.requiredApprovals || 1,
          isFinalized: false,
          verificationStatus: 'PENDING_APPROVAL',
        };
      }
    });
    if (Object.keys(initial).length > 0) {
      setApprovalState((prev) => ({ ...initial, ...prev }));
    }
  }, [allExpenses]);

  // ── Cast Approval Vote ─────────────────────────────────────────────────────
  const handleCastVote = useCallback(
    async (expense: any, action: 'APPROVE' | 'DISPUTE') => {
      const expenseId = expense.id;
      const tripId = expense.tripId;
      if (!tripId || !expenseId) return;

      setApprovalState((prev) => ({
        ...prev,
        [expenseId]: { ...(prev[expenseId] || {}), loading: true },
      }));

      try {
        const res = await groupService.reviewExpenseApproval(tripId, expenseId, action);
        const data = res?.data;
        setApprovalState((prev) => ({
          ...prev,
          [expenseId]: {
            loading: false,
            voted: action,
            approveCount: data?.approveCount ?? (prev[expenseId]?.approveCount || 0),
            requiredApprovals: data?.requiredApprovals ?? (prev[expenseId]?.requiredApprovals || 1),
            isFinalized: Boolean(data?.isFinalized),
            verificationStatus: data?.verificationStatus || 'PENDING_APPROVAL',
          },
        }));

        if (data?.isFinalized && data.verificationStatus === 'VERIFIED') {
          Alert.alert(
            '✅ Expense Approved!',
            `"${expense.title}" has reached 60% group approval and has been verified.`
          );
          await refreshTrips();
        } else if (action === 'APPROVE') {
          Alert.alert(
            '✅ Vote Recorded',
            `Your approval (${data?.approveCount}/${data?.requiredApprovals}) has been submitted.`
          );
        } else {
          Alert.alert(
            '❌ Dispute Registered',
            'Your dispute has been submitted. The payer will be notified.'
          );
        }
      } catch (err: any) {
        setApprovalState((prev) => ({
          ...prev,
          [expenseId]: { ...(prev[expenseId] || {}), loading: false },
        }));
        Alert.alert('Error', err?.message || 'Could not submit vote. Please try again.');
      }
    },
    [refreshTrips]
  );

  // ── Settlement Handlers ────────────────────────────────────────────────────
  const handlePayUPI = (t: SettlementTransfer) => {
    const upiUrl = `upi://pay?pa=${t.toUpiId || 'yogesh@okaxis'}&pn=${encodeURIComponent(
      t.toMemberName
    )}&am=${t.amount}&cu=INR&tn=${encodeURIComponent(`Settlement for ${activeTrip?.name || 'Trip'}`)}`;

    if (Platform.OS === 'android' && NativeModules.UpiPayment?.startPayment) {
      NativeModules.UpiPayment.startPayment(upiUrl, null)
        .then((res: any) => {
          if (res && (res.status === 'SUCCESS' || res.status?.toLowerCase() === 'success')) {
            Alert.alert(
              'Payment Confirmed by Bank',
              `Verified Ref: ${res.approvalRefNo || 'Confirmed'}. Settling debt...`,
              [{ text: 'OK', onPress: () => handleMarkSettled(t) }]
            );
          }
        })
        .catch((err: any) => {
          console.warn('Native settle error:', err);
        });
      return;
    }

    Linking.canOpenURL(upiUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(upiUrl);
        } else {
          Alert.alert(
            'UPI Payment',
            `No UPI app detected. Target VPA: ${t.toUpiId || 'yogesh@okaxis'}\nAmount: ₹${t.amount}`
          );
        }
      })
      .catch(() => {
        Alert.alert('Payment Error', 'Could not launch UPI application.');
      });
  };

  const handleMarkSettled = async (t: SettlementTransfer) => {
    if (!activeTrip) return;
    await recordSettlement(activeTrip.id, {
      fromMemberId: t.fromMemberId,
      fromMemberName: t.fromMemberName,
      toMemberId: t.toMemberId,
      toMemberName: t.toMemberName,
      amount: t.amount,
      remarks: 'Settled via Smart Settlement Optimizer',
    });
    Alert.alert('Settled!', `Payment of ₹${t.amount} marked as completed in local ledger.`);
  };

  // ── Approval Banner ────────────────────────────────────────────────────────
  // Determine if current user is the payer for an expense
  const isCurrentUserPayer = (exp: any): boolean => {
    if (!user) return false;
    // Match by userId embedded in expense paidById or by username/email
    return (
      exp.paidById === user.id ||
      exp.paidByName === (user.username || user.name) ||
      exp.paidByUserId === user.id
    );
  };

  // Pending expenses where current user has NOT yet voted and has not finalized
  const pendingApprovalExpenses = useMemo(() => {
    return allExpenses.filter((exp: any) => {
      if (exp.verificationStatus !== 'PENDING_APPROVAL') return false;
      const state = approvalState[exp.id];
      if (state?.isFinalized || state?.verificationStatus === 'VERIFIED') return false;
      return true;
    });
  }, [allExpenses, approvalState]);

  const renderApprovalBanner = (exp: any) => {
    const state = approvalState[exp.id] || {
      loading: false,
      voted: null,
      approveCount: (exp.approvals || []).filter((a: any) => a.action === 'APPROVE').length,
      requiredApprovals: exp.requiredApprovals || 1,
      isFinalized: false,
      verificationStatus: 'PENDING_APPROVAL',
    };

    const isPayer = isCurrentUserPayer(exp);
    const progressPct = Math.min(
      100,
      Math.round((state.approveCount / (state.requiredApprovals || 1)) * 100)
    );

    return (
      <View key={exp.id} style={styles.approvalCard}>
        {/* Header row */}
        <View style={styles.approvalHeader}>
          <View style={styles.approvalHeaderLeft}>
            <AlertTriangle size={16} color={colors.slate600} />
            <Text style={styles.approvalHeaderLabel}>APPROVAL NEEDED</Text>
          </View>
          <View style={styles.approvalBadge}>
            <Text style={styles.approvalBadgeText}>
              {state.approveCount}/{state.requiredApprovals} · 60%
            </Text>
          </View>
        </View>

        {/* Expense info */}
        <Text style={styles.approvalExpenseTitle} numberOfLines={1}>
          {exp.title}
        </Text>
        <Text style={styles.approvalExpenseMeta}>
          ₹{Number(exp.amount).toFixed(2)} · Paid by {exp.paidByName} · {exp.tripName}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>
          {state.approveCount} of {state.requiredApprovals} approvals (need 60% of group)
        </Text>

        {isPayer ? (
          <View style={styles.payerNote}>
            <ShieldCheck size={13} color="#059669" />
            <Text style={styles.payerNoteText}>
              You submitted this — waiting for companions to approve
            </Text>
          </View>
        ) : state.loading ? (
          <ActivityIndicator size="small" color="#464B29" style={{ marginTop: 10 }} />
        ) : (
          <View style={styles.approvalButtons}>
            <TouchableOpacity
              style={styles.approveBtn}
              activeOpacity={0.85}
              onPress={() => handleCastVote(exp, 'APPROVE')}
            >
              <ThumbsUp size={14} color="#FFFFFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.disputeBtn}
              activeOpacity={0.85}
              onPress={() => handleCastVote(exp, 'DISPUTE')}
            >
              <ThumbsDown size={14} color={colors.slate700} />
              <Text style={styles.disputeBtnText}>Dispute</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, styles.content]}>
      {/* ── 3-Card Financial Overview ────────────────────────────────────── */}
      <View style={styles.metricsTabsCard}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Spent</Text>
          <Text style={styles.metricValue}>₹{totalSpent.toLocaleString()}</Text>
          <Text style={styles.metricFoot}>Across {trips.length} trips</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardOwed]}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricLabel}>You Are Owed</Text>
              <TrendingUp size={12} color={colors.primary600} />
            </View>
            <Text style={[styles.metricValue, { color: colors.primary700 }]}> 
              ₹{youAreOwed.toLocaleString()}
            </Text>
            <Text style={styles.metricFoot}>Group owes you</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCardOwes]}>
            <View style={styles.metricTitleRow}>
              <Text style={styles.metricLabel}>You Owe</Text>
              <TrendingDown size={12} color="#D97706" />
            </View>
            <Text style={[styles.metricValue, { color: '#B45309' }]}> 
              ₹{youOwe.toLocaleString()}
            </Text>
            <Text style={styles.metricFoot}>Pay your share</Text>
          </View>
        </View>

        {/* ── Standard underlined tab menu ──────────────────────────────────── */}
        <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'expenses' && styles.subTabBtnActive]}
          onPress={() => setSubTab('expenses')}
        >
          <Receipt size={13} color={subTab === 'expenses' ? colors.primary700 : colors.slate400} />
          <Text style={[styles.subTabText, subTab === 'expenses' && styles.subTabTextActive]}>
            All Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'approvals' && styles.subTabBtnActive]}
          onPress={() => setSubTab('approvals')}
        >
          <ShieldCheck size={13} color={subTab === 'approvals' ? colors.primary700 : colors.slate400} />
          <Text style={[styles.subTabText, subTab === 'approvals' && styles.subTabTextActive]}>
            Approvals{pendingApprovalExpenses.length > 0 ? ` (${pendingApprovalExpenses.length})` : ''}
          </Text>
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
      {/* ── Approval validation ───────────────────────────────────────────── */}
      {subTab === 'approvals' && (
        <View>
          {pendingApprovalExpenses.length === 0 ? (
            <View style={styles.emptyWrap}>
              <CheckCircle2 size={32} color={colors.primary500} />
              <Text style={styles.emptyText}>No expenses awaiting approval</Text>
            </View>
          ) : (
            pendingApprovalExpenses.map((exp: any) => renderApprovalBanner(exp))
          )}
        </View>
      )}

      {/* ── 2. Unified Expenses Stream ───────────────────────────────────── */}
      {subTab === 'expenses' && (
        <View>
          <Text style={styles.sectionHeader}>All Recorded Expenses</Text>
          {(() => {
            const displayed = q === ''
              ? allExpenses
              : allExpenses.filter((exp) =>
                  exp.title?.toLowerCase().includes(q) ||
                  exp.tripName?.toLowerCase().includes(q) ||
                  exp.paidByName?.toLowerCase().includes(q)
                );
            if (displayed.length === 0) return (
              <View style={styles.emptyWrap}>
                <Receipt size={32} color={colors.slate400} />
                <Text style={styles.emptyText}>
                  {q ? `No expenses match "${searchQuery}"` : 'No expenses recorded yet.'}
                </Text>
              </View>
            );
            return displayed.map((exp: any) => (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseIconWrap}>
                  {exp.verificationStatus === 'AUTO_VERIFIED' ? (
                    <ShieldCheck size={16} color="#15803D" />
                  ) : exp.verificationStatus === 'PENDING_APPROVAL' ? (
                    <Clock size={16} color="#D97706" />
                  ) : (
                    <Receipt size={16} color={colors.primary600} />
                  )}
                </View>
                <View style={styles.expenseMain}>
                  <Text style={styles.expenseTitle}>{exp.title}</Text>
                  <Text style={styles.expenseSub}>
                    Paid by {exp.paidByName} · {exp.tripName}
                  </Text>
                </View>
                <View style={styles.expenseAmountWrap}>
                  <Text style={styles.expenseAmount}>
                    {exp.currencySymbol}{exp.amount.toLocaleString()}
                  </Text>
                  <View style={[
                    styles.expenseStatusBadge,
                    exp.verificationStatus === 'AUTO_VERIFIED'
                      ? { backgroundColor: '#DCFCE7' }
                      : exp.verificationStatus === 'PENDING_APPROVAL'
                      ? { backgroundColor: '#FEF3C7' }
                      : exp.verificationStatus === 'DISPUTED'
                      ? { backgroundColor: '#FEE2E2' }
                      : { backgroundColor: '#F0FDF4' }
                  ]}>
                    <Text style={[
                      styles.expenseStatusText,
                      exp.verificationStatus === 'AUTO_VERIFIED'
                        ? { color: '#15803D' }
                        : exp.verificationStatus === 'PENDING_APPROVAL'
                        ? { color: '#92400E' }
                        : exp.verificationStatus === 'DISPUTED'
                        ? { color: '#DC2626' }
                        : { color: '#059669' }
                    ]}>
                      {exp.verificationStatus === 'AUTO_VERIFIED' ? '✓ SMS' :
                       exp.verificationStatus === 'PENDING_APPROVAL' ? '⏳ 60%' :
                       exp.verificationStatus === 'DISPUTED' ? '⚠ Dispute' : '✓'}
                    </Text>
                  </View>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    padding: 16,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },

  // ── Approval Banners ──────────────────────────────────────────────────────
  approvalSection: {
    marginBottom: 16,
  },
  approvalSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate700,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  approvalCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: cardRadius.card,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  approvalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  approvalHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate600,
    letterSpacing: 0.4,
  },
  approvalBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: cardRadius.pill,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate700,
  },
  approvalExpenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  approvalExpenseMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 10,
  },
  payerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: colors.slate50,
    padding: 8,
    borderRadius: cardRadius.inner,
  },
  payerNoteText: {
    fontSize: 12,
    color: colors.slate600,
    fontWeight: '600',
    flex: 1,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: cardRadius.inner,
    gap: 6,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disputeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 10,
    borderRadius: cardRadius.inner,
    gap: 6,
  },
  disputeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate700,
  },

  // ── Metrics Grid ──────────────────────────────────────────────────────────
  metricsTabsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: cardRadius.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: -16,
    marginTop: -16,
    ...shadows.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: 0,
  },
  metricCardOwed: {
    backgroundColor: colors.bgCard,
  },
  metricCardOwes: {
    backgroundColor: colors.bgCard,
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.editorialSubtle || colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.editorialDark || colors.slate900,
    marginVertical: 4,
  },
  metricFoot: {
    fontSize: 9.5,
    color: colors.editorialSubtle || colors.slate400,
  },

  // ── Sub-Tab Toggle ────────────────────────────────────────────────────────
  subTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: 2,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  subTabBtnActive: {
    borderBottomColor: colors.primary600,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.editorialMuted || colors.slate500,
  },
  subTabTextActive: {
    color: colors.editorialDark || colors.slate900,
    fontWeight: '700',
  },

  // ── Section Header ────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.editorialDark || colors.slate900,
    marginBottom: 10,
  },

  // ── Settlement Transfer Cards ─────────────────────────────────────────────
  transferCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderWarmLight || colors.borderSubtle,
    ...shadows.sm,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  transferMid: {
    flex: 1,
    alignItems: 'center',
  },
  transferName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.editorialDark || colors.slate800,
  },
  transferSubLine: {
    fontSize: 10,
    color: colors.slate400,
  },
  transferAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.editorialDark || colors.slate900,
    textAlign: 'center',
    marginBottom: 10,
  },
  transferActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payUpiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary700 || '#464B29',
    paddingVertical: 9,
    borderRadius: radii.sm,
    gap: 5,
  },
  payUpiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50 || '#F0FDF4',
    borderWidth: 1,
    borderColor: colors.primary200 || '#BBF7D0',
    paddingVertical: 9,
    borderRadius: radii.sm,
    gap: 5,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary700 || '#15803D',
  },

  // ── Expense Row ───────────────────────────────────────────────────────────
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderWarmLight || colors.borderSubtle,
    gap: 10,
  },
  expenseIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary50 || '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseMain: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.editorialDark || colors.slate800,
  },
  expenseSub: {
    fontSize: 11,
    color: colors.editorialSubtle || colors.slate500,
    marginTop: 1,
  },
  expenseAmountWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.editorialDark || colors.slate900,
  },
  expenseStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expenseStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.editorialSubtle || colors.slate400,
    textAlign: 'center',
  },
});
