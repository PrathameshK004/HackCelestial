/**
 * Expenses Tab matching WebApp 'expenses' dock tab
 * Features Global Financial Stats, Min-Cash-Flow Smart Settlement Optimizer, and Unified Expense Stream
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
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
} from 'lucide-react-native';
import { colors, radii, shadows } from '../../theme/colors';
import { useTrips } from '../../context/TripContext';
import { ledgerEngine } from '../../sync/ledgerEngine';
import { SettlementTransfer } from '../../types';

interface ExpensesTabProps {
  onOpenSettleModal?: (transfer: SettlementTransfer) => void;
  searchQuery?: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({ onOpenSettleModal, searchQuery = '' }) => {
  const { trips, recordSettlement } = useTrips();
  const [subTab, setSubTab] = useState<'optimizer' | 'expenses'>('optimizer');
  const q = searchQuery.trim().toLowerCase();

  // Compute global finances across all SQLite trips
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
        t.expenses.forEach((e) => {
          expensesList.push({ ...e, tripName: t.name, currencySymbol: t.currencySymbol });
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

  const handlePayUPI = (t: SettlementTransfer) => {
    const upiUrl = `upi://pay?pa=${t.toUpiId || 'yogesh@okaxis'}&pn=${encodeURIComponent(
      t.toMemberName
    )}&am=${t.amount}&cu=INR&tn=${encodeURIComponent(`Settlement for ${activeTrip?.name || 'Trip'}`)}`;

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 3-Card Financial Overview Header */}
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
          <Text style={styles.metricFoot}>To receive</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardOwes]}>
          <View style={styles.metricTitleRow}>
            <Text style={styles.metricLabel}>You Owe</Text>
            <TrendingDown size={12} color={colors.accentAmber} />
          </View>
          <Text style={[styles.metricValue, { color: '#92400e' }]}>
            ₹{youOwe.toLocaleString()}
          </Text>
          <Text style={styles.metricFoot}>To settle</Text>
        </View>
      </View>

      {/* Sub-Tabs: Settlement Optimizer vs All Expenses */}
      <View style={styles.subTabRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'optimizer' && styles.subTabBtnActive]}
          onPress={() => setSubTab('optimizer')}
          activeOpacity={0.8}
        >
          <Zap
            size={14}
            color={subTab === 'optimizer' ? colors.primary600 : colors.slate500}
          />
          <Text
            style={[
              styles.subTabText,
              subTab === 'optimizer' && styles.subTabTextActive,
            ]}
          >
            Settlement Optimizer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'expenses' && styles.subTabBtnActive]}
          onPress={() => setSubTab('expenses')}
          activeOpacity={0.8}
        >
          <Receipt
            size={14}
            color={subTab === 'expenses' ? colors.primary600 : colors.slate500}
          />
          <Text
            style={[
              styles.subTabText,
              subTab === 'expenses' && styles.subTabTextActive,
            ]}
          >
            Recent Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. Optimizer View */}
      {subTab === 'optimizer' && optimalResult && (
        <View>

          {/* Transfers List */}
          <Text style={styles.sectionHeader}>Optimal Transfers Needed</Text>

          {optimalResult.transfers.map((t, idx) => (
            <View key={t.id} style={styles.transferCard}>
              <View style={styles.transferHeader}>
                <View style={styles.avatarRow}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: t.fromAvatarBg || colors.accentAmber },
                    ]}
                  >
                    <Text style={styles.avatarLetter}>
                      {t.fromMemberName.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.payerName}>{t.fromMemberName}</Text>
                </View>

                <View style={styles.arrowWrap}>
                  <Text style={styles.transferAmount}>
                    {t.currencySymbol}{t.amount.toLocaleString()}
                  </Text>
                  <ArrowRight size={14} color={colors.slate400} />
                </View>

                <View style={styles.avatarRow}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: t.toAvatarBg || colors.primary600 },
                    ]}
                  >
                    <Text style={styles.avatarLetter}>
                      {t.toMemberName.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.payerName}>{t.toMemberName}</Text>
                </View>
              </View>

              {/* Action Buttons: UPI Pay & Mark Settled */}
              <View style={styles.transferActions}>
                <TouchableOpacity
                  style={styles.upiBtn}
                  onPress={() => handlePayUPI(t)}
                  activeOpacity={0.8}
                >
                  <Smartphone size={13} color="#ffffff" />
                  <Text style={styles.upiBtnText}>Pay via UPI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => handleMarkSettled(t)}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={13} color={colors.primary700} />
                  <Text style={styles.settleBtnText}>Mark Settled</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 2. Unified Expenses Stream */}
      {subTab === 'expenses' && (
        <View>
          <Text style={styles.sectionHeader}>All Recorded Expenses</Text>
          {(() => {
            const displayed = q === '' ? allExpenses : allExpenses.filter((exp) =>
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
            return displayed.map((exp) => (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseIconWrap}>
                  <Receipt size={16} color={colors.primary600} />
                </View>
                <View style={styles.expenseMain}>
                  <Text style={styles.expenseTitle}>{exp.title}</Text>
                  <Text style={styles.expenseSub}>
                    Paid by {exp.paidByName} • {exp.tripName}
                  </Text>
                </View>
                <View style={styles.expenseAmountWrap}>
                  <Text style={styles.expenseAmount}>
                    {exp.currencySymbol}{exp.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.expenseCategory}>{exp.category}</Text>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  content: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.sm,
  },
  metricCardOwed: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary200,
  },
  metricCardOwes: {
    backgroundColor: colors.accentAmberLight,
    borderColor: '#fde68a',
  },
  metricTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate900,
    marginVertical: 4,
  },
  metricFoot: {
    fontSize: 9.5,
    color: colors.slate400,
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.slate100,
    padding: 4,
    borderRadius: radii.md,
    marginBottom: 16,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm,
    gap: 6,
  },
  subTabBtnActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.slate500,
  },
  subTabTextActive: {
    color: colors.slate900,
    fontWeight: '700',
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 10,
  },
  transferCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 12,
    ...shadows.sm,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '35%',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  payerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate800,
  },
  arrowWrap: {
    alignItems: 'center',
  },
  transferAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary700,
    marginBottom: 2,
  },
  transferActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingTop: 10,
  },
  upiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    paddingVertical: 7,
    borderRadius: radii.sm,
    gap: 5,
  },
  upiBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  settleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primary200,
    gap: 5,
  },
  settleBtnText: {
    color: colors.primary700,
    fontSize: 11.5,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
    gap: 12,
    ...shadows.sm,
  },
  expenseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseMain: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.slate900,
  },
  expenseSub: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 2,
  },
  expenseAmountWrap: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate900,
  },
  expenseCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary600,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate400,
  },
});
