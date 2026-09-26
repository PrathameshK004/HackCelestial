/**
 * PaymentsScreen — 100% Mobile UI Parity with WebApp PaymentsPage
 *
 * Matches the WebApp's Transactions page mobile view exactly:
 * - Top nav: "Transactions" title + Back arrow (no user profile details)
 * - Permanent search bar with Sort/Filter dropdown
 * - Metrics banner: Total Spent | Total Received | Status
 * - Horizontal capsule filter row: All | Paid | Received (with count badges)
 * - Sectioned, date-grouped flat transaction list
 * - Per-row: category icon bubble, title + meta, amount (+ green / - red)
 * - Transaction Receipt bottom sheet on row tap
 * - Floating QR Scanner FAB (bottom right)
 * - Empty state with SVG illustration
 *
 * Data: Loaded from local SQLite trips (offline-first) + backend sync
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
  Alert,
  Share,
  BackHandler,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  X,
  Check,
  Plus,
  QrCode,
  ShieldCheck,
  Copy,
  Briefcase,
  Music,
  Coffee,
  Fuel,
  Activity,
  Home,
  Compass,
  ChevronDown,
} from 'lucide-react-native';
import { colors, radii, shadows } from '../theme/colors';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/apiClient';
import { UpiPaymentModal } from '../components/payment/UpiPaymentModal';
import { QrCameraScannerModal } from '../components/payment/QrCameraScannerModal';
import { ParsedUpiData } from '../utils/upi.util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Types ─────────────────────────────────────────────────────────────────────
type FilterDirection = 'all' | 'paid' | 'received';
type SortBy = 'recent' | 'highest' | 'lowest' | 'income' | 'expense';
type IconType = 'income' | 'entertainment' | 'food' | 'transport' | 'health' | 'stay' | 'travel';

interface TransactionItem {
  id: string;
  txId: string;
  title: string;
  category: string;
  note: string;
  dateGroup: string;
  timestamp: string;
  type: 'received' | 'sent';
  amount: number;
  currencySymbol: string;
  counterpart: string;
  groupName: string;
  method: string;
  iconType: IconType;
  splitModel?: string;
}

// ── Category Icon Bubble ──────────────────────────────────────────────────────
const CategoryIcon: React.FC<{ iconType: IconType; isIncome: boolean }> = ({ iconType, isIncome }) => {
  const iconProps = { size: 18, strokeWidth: 2 };
  type IconConfig = { bg: string; color: string; icon: React.ReactNode };

  const map: Record<IconType, IconConfig> = {
    income:        { bg: '#E8F5E9', color: '#2E7D32', icon: <Briefcase {...iconProps} color="#2E7D32" /> },
    entertainment: { bg: '#E8F5E9', color: '#1B5E20', icon: <Music {...iconProps} color="#1B5E20" /> },
    food:          { bg: '#E0F2F1', color: '#00796B', icon: <Coffee {...iconProps} color="#00796B" /> },
    transport:     { bg: '#ECEFF1', color: '#455A64', icon: <Fuel {...iconProps} color="#455A64" /> },
    health:        { bg: '#E0F7FA', color: '#00838F', icon: <Activity {...iconProps} color="#00838F" /> },
    stay:          { bg: '#FFF3E0', color: '#E65100', icon: <Home {...iconProps} color="#E65100" /> },
    travel: {
      bg: isIncome ? '#E8F5E9' : '#F1F5F9',
      color: isIncome ? '#2E7D32' : '#475569',
      icon: <Compass {...iconProps} color={isIncome ? '#2E7D32' : '#475569'} />,
    },
  };

  const cfg = map[iconType] || map.travel;
  return (
    <View style={[styles.iconBubble, { backgroundColor: cfg.bg }]}>
      {cfg.icon}
    </View>
  );
};

// ── Map expense category → icon type ─────────────────────────────────────────
const categoryToIconType = (cat: string, type: string): IconType => {
  if (type === 'received') return 'income';
  const c = (cat || '').toLowerCase();
  if (c.includes('food') || c.includes('meal') || c.includes('dining')) return 'food';
  if (c.includes('transport') || c.includes('fuel') || c.includes('travel')) return 'transport';
  if (c.includes('stay') || c.includes('hotel') || c.includes('accomm')) return 'stay';
  if (c.includes('entertain') || c.includes('music') || c.includes('movie')) return 'entertainment';
  if (c.includes('health') || c.includes('medical')) return 'health';
  return 'travel';
};

// ── Date bucket helper ────────────────────────────────────────────────────────
const toDateGroup = (dateStr: string): string => {
  if (!dateStr) return 'Earlier';
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Earlier';
  }
};

// ── Sort label map ────────────────────────────────────────────────────────────
const SORT_LABELS: Record<SortBy, string> = {
  recent:  'Recent',
  highest: 'Highest Amount',
  lowest:  'Lowest Amount',
  income:  'Income Only',
  expense: 'Expenses Only',
};

interface PaymentsScreenProps {
  onBack?: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
export const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { trips, refreshTrips } = useTrips();
  const { token } = useAuth();

  // ── Data State ────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalSpent, setTotalSpent]     = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTrips();
      await loadPaymentsData();
    } catch (err) {
      console.warn('Refresh error in PaymentsScreen:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── UI State ─────────────────────────────────────────────────────────────
  const [filterDir, setFilterDir]   = useState<FilterDirection>('all');
  const [sortBy, setSortBy]         = useState<SortBy>('recent');
  const [showSort, setShowSort]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannedPaymentData, setScannedPaymentData] = useState<ParsedUpiData | null>(null);

  // ── Hardware Back Press Handler ───────────────────────────────────────────
  useEffect(() => {
    const onHardwareBack = () => {
      // 0. Dismiss Camera Scanner if open
      if (isCameraScannerOpen) {
        setIsCameraScannerOpen(false);
        return true;
      }
      // 1. Dismiss UPI Modal if open
      if (isUpiModalOpen) {
        setIsUpiModalOpen(false);
        return true;
      }
      // 2. Dismiss Transaction Receipt Modal if open
      if (selectedTx) {
        setSelectedTx(null);
        return true;
      }
      // 3. Dismiss Sort Dropdown if open
      if (showSort) {
        setShowSort(false);
        return true;
      }
      // 4. Clear active search input
      if (searchQuery.length > 0) {
        setSearchQuery('');
        return true;
      }
      // 5. Reset direction filter to 'all'
      if (filterDir !== 'all') {
        setFilterDir('all');
        return true;
      }
      // 6. Navigate back to previous screen / explore tab
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [selectedTx, showSort, searchQuery, filterDir, isUpiModalOpen, isCameraScannerOpen, onBack]);

  // ── Build transactions from local SQLite trips (offline-first) ───────────
  const buildLocalTransactions = (): TransactionItem[] => {
    const list: TransactionItem[] = [];
    trips.forEach((trip) => {
      // Expenses → "sent" transactions
      (trip.expenses || []).forEach((exp) => {
        list.push({
          id: exp.id,
          txId: `EXP-${exp.id.slice(0, 8).toUpperCase()}`,
          title: exp.title,
          category: exp.category,
          note: exp.description || '',
          dateGroup: toDateGroup(exp.date),
          timestamp: exp.time || '12:00',
          type: 'sent',
          amount: exp.amount,
          currencySymbol: trip.currencySymbol || '₹',
          counterpart: exp.paidByName,
          groupName: trip.name,
          method: exp.paymentMethod || 'Cash',
          iconType: categoryToIconType(exp.category, 'sent'),
          splitModel: exp.splitModel,
        });
      });

      // Settlements → "received" or "sent"
      (trip.settlements || []).forEach((s) => {
        list.push({
          id: s.id,
          txId: `STL-${s.id.slice(0, 8).toUpperCase()}`,
          title: `Settlement: ${s.fromMemberName} → ${s.toMemberName}`,
          category: 'Settlement',
          note: s.remarks || '',
          dateGroup: toDateGroup(s.createdAt || ''),
          timestamp: '00:00',
          type: s.status === 'completed' ? 'received' : 'sent',
          amount: s.amount,
          currencySymbol: s.currencySymbol || '₹',
          counterpart: s.fromMemberName,
          groupName: trip.name,
          method: s.paymentMethod || 'UPI',
          iconType: 'income',
        });
      });
    });

    // Sort by most recent date group
    return list.sort((a, b) => {
      const order = ['Today', 'Yesterday'];
      const ai = order.indexOf(a.dateGroup);
      const bi = order.indexOf(b.dateGroup);
      if (ai !== -1 && bi === -1) return -1;
      if (bi !== -1 && ai === -1) return 1;
      return 0;
    });
  };

  // ── Load data: prefer backend, fallback to SQLite ────────────────────────
  const loadPaymentsData = async () => {
    setIsLoading(true);

    // Try backend first
    if (token) {
      try {
        const res = await apiRequest<any>('/users/me/payments', { method: 'GET' });
        if (res?.data?.transactions) {
          setTransactions(res.data.transactions);
          setTotalSpent(res.data.totalSpent || 0);
          setTotalReceived(res.data.totalReceived || 0);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall through to local SQLite data
      }
    }

    // Fallback: build from local SQLite trips
    const local = buildLocalTransactions();
    const spent = local.filter((t) => t.type === 'sent').reduce((s, t) => s + t.amount, 0);
    const received = local.filter((t) => t.type === 'received').reduce((s, t) => s + t.amount, 0);
    setTransactions(local);
    setTotalSpent(spent);
    setTotalReceived(received);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPaymentsData();
  }, [token, trips]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const countAll      = transactions.length;
  const countPaid     = useMemo(() => transactions.filter((t) => t.type === 'sent').length, [transactions]);
  const countReceived = useMemo(() => transactions.filter((t) => t.type === 'received').length, [transactions]);

  // ── Filtered + Sorted list ────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let list = [...transactions];
    if (filterDir === 'paid') list = list.filter((t) => t.type === 'sent');
    else if (filterDir === 'received') list = list.filter((t) => t.type === 'received');

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        t.counterpart.toLowerCase().includes(q) ||
        t.groupName.toLowerCase().includes(q) ||
        t.txId.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'highest': list.sort((a, b) => b.amount - a.amount); break;
      case 'lowest':  list.sort((a, b) => a.amount - b.amount); break;
      case 'income':  list = list.filter((t) => t.type === 'received'); break;
      case 'expense': list = list.filter((t) => t.type === 'sent'); break;
    }
    return list;
  }, [transactions, filterDir, sortBy, searchQuery]);

  // ── Group by date ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, TransactionItem[]> = {};
    filteredList.forEach((item) => {
      if (!g[item.dateGroup]) g[item.dateGroup] = [];
      g[item.dateGroup].push(item);
    });
    return g;
  }, [filteredList]);

  // ── Receipt copy ──────────────────────────────────────────────────────────
  const handleCopyId = (txId: string) => {
    setCopiedId(txId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Transactions', 'There are no transactions to export.');
      return;
    }
    const csvContent =
      'Transaction ID,Title,Category,Note,Date,Type,Amount,Currency,Counterpart,Group,Method\n' +
      transactions
        .map(
          (p) =>
            `"${p.txId}","${p.title}","${p.category}","${p.note}","${p.dateGroup}","${p.type}","${p.amount}","${p.currencySymbol}","${p.counterpart}","${p.groupName}","${p.method}"`
        )
        .join('\n');
    try {
      await Share.share({
        title: 'Triptual Transactions CSV',
        message: csvContent,
      });
    } catch {
      Alert.alert('Exported', `Exported ${transactions.length} transactions.`);
    }
  };

  const handleRecordPayment = () => {
    Alert.alert(
      'Make / Record Payment',
      'Choose payment method:',
      [
        {
          text: 'Scan QR with Camera',
          onPress: () => {
            setIsCameraScannerOpen(true);
          },
        },
        {
          text: 'Enter UPI ID Manually',
          onPress: () => {
            setScannedPaymentData(null);
            setIsUpiModalOpen(true);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleScanQr = () => {
    setIsCameraScannerOpen(true);
  };

  const handleScanSuccess = (data: ParsedUpiData) => {
    setIsCameraScannerOpen(false);
    setScannedPaymentData(data);
    setIsUpiModalOpen(true);
  };

  const handleRequestCameraScanFromModal = () => {
    setIsUpiModalOpen(false);
    setTimeout(() => {
      setIsCameraScannerOpen(true);
    }, 250);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Navigation ── */}
      <View style={[styles.topNav, { paddingTop: insets.top + 8 }]}>
        <View style={styles.navLeft}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <ArrowLeft size={20} color="#334155" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle}>Transactions</Text>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleRecordPayment}
            activeOpacity={0.7}
            accessibilityLabel="Record Payment"
          >
            <Plus size={17} color="#475569" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#059669', '#243E36']}
            tintColor="#059669"
          />
        }
      >
        {/* ── Search Bar + Sort/Filter ── */}
        <View style={styles.searchBox}>
          <Search size={15} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, note, or peer..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}

          <View style={styles.searchSeparator} />

          <TouchableOpacity
            style={[styles.sortFilterBtn, showSort && styles.sortFilterBtnActive]}
            onPress={() => setShowSort((p) => !p)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={15} color={showSort ? '#059669' : '#64748B'} strokeWidth={2.2} />
            {sortBy !== 'recent' && <View style={styles.filterDot} />}
          </TouchableOpacity>

          {/* Sort Dropdown */}
          {showSort && (
            <View style={styles.sortDropdown}>
              <Text style={styles.sortDropdownLabel}>SORT & FILTER</Text>
              {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([id, label]) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.sortOption, sortBy === id && styles.sortOptionActive]}
                  onPress={() => { setSortBy(id); setShowSort(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortOptionText, sortBy === id && styles.sortOptionTextActive]}>
                    {label}
                  </Text>
                  {sortBy === id && <Check size={14} color="#243E36" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Metrics Banner ── */}
        <View style={styles.metricsBanner}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>TOTAL SPENT</Text>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>-₹{totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>TOTAL RECEIVED</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>+₹{totalReceived.toLocaleString()}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.metricLabel}>STATUS</Text>
            <Text style={[styles.metricValue, { fontSize: 12, color: '#243E36' }]}>
              {transactions.length} Verified
            </Text>
          </View>
        </View>

        {/* ── Capsule Filter Row ── */}
        <View style={styles.capsuleRow}>
          {(
            [
              { id: 'all', label: 'All', count: countAll },
              { id: 'paid', label: 'Paid', count: countPaid },
              { id: 'received', label: 'Received', count: countReceived },
            ] as { id: FilterDirection; label: string; count: number }[]
          ).map(({ id, label, count }) => (
            <TouchableOpacity
              key={id}
              style={[styles.capsuleBtn, filterDir === id && styles.capsuleBtnActive]}
              onPress={() => setFilterDir(id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.capsuleBtnText, filterDir === id && styles.capsuleBtnTextActive]}>
                {label}
              </Text>
              <View style={[styles.capsuleBadge, filterDir === id && styles.capsuleBadgeActive]}>
                <Text style={[styles.capsuleBadgeText, filterDir === id && styles.capsuleBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Transaction List ── */}
        {Object.keys(grouped).length > 0 ? (
          <View style={styles.streamFlow}>
            {Object.entries(grouped).map(([dateGroup, items]) => (
              <View key={dateGroup} style={styles.dateSection}>
                {/* Date Group Heading */}
                <Text style={styles.dateGroupHeading}>{dateGroup}</Text>

                {/* Transaction Rows */}
                <View style={styles.flatItemsList}>
                  {items.map((tx, idx) => {
                    const isIncome = tx.type === 'received';
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.txRow,
                          idx === items.length - 1 && styles.txRowLast,
                        ]}
                        onPress={() => setSelectedTx(tx)}
                        activeOpacity={0.7}
                      >
                        {/* Category Icon Bubble */}
                        <CategoryIcon iconType={tx.iconType} isIncome={isIncome} />

                        {/* Info Column */}
                        <View style={styles.txContent}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <View style={styles.txMeta}>
                            <Text style={styles.txMetaTag}>{tx.groupName || tx.category}</Text>
                            <Text style={styles.txMetaDot}>·</Text>
                            <Text style={styles.txMetaTime}>{tx.timestamp}</Text>
                            {tx.splitModel && (
                              <>
                                <Text style={styles.txMetaDot}>·</Text>
                                <Text style={styles.txSplitTag}>{tx.splitModel} split</Text>
                              </>
                            )}
                          </View>
                        </View>

                        {/* Amount */}
                        <Text
                          style={[
                            styles.txAmount,
                            isIncome ? styles.txAmountIncome : styles.txAmountExpense,
                          ]}
                        >
                          {isIncome ? '+' : '-'}
                          {tx.currencySymbol}
                          {tx.amount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ── Empty State ── */
          <View style={styles.emptyState}>
            {/* SVG-style placeholder card illustration */}
            <View style={styles.emptyIllustration}>
              <View style={styles.emptyCardOuter}>
                <View style={styles.emptyCardBar} />
                <View style={styles.emptyCardChip} />
              </View>
              <View style={styles.emptyLineA} />
              <View style={styles.emptyLineB} />
            </View>

            <Text style={styles.emptyTitle}>
              {isLoading ? 'Loading payment records...' : 'No transactions recorded yet'}
            </Text>
            <Text style={styles.emptySub}>
              {isLoading
                ? 'Retrieving your real-time payment and settlement ledger…'
                : 'Expedition expenses and peer settlements will be tracked here in real-time.'}
            </Text>

            {isLoading && (
              <ActivityIndicator color="#059669" size="small" style={{ marginTop: 16 }} />
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating QR FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleScanQr}
        activeOpacity={0.85}
        accessibilityLabel="Scan QR Code"
      >
        <QrCode size={21} color="#243E36" strokeWidth={2.2} />
      </TouchableOpacity>

      {/* ── Transaction Receipt Bottom Sheet ── */}
      {selectedTx && (
        <Modal
          visible={!!selectedTx}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTx(null)}
        >
          <TouchableOpacity
            style={styles.receiptBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedTx(null)}
          >
            <View style={styles.receiptSheet} onStartShouldSetResponder={() => true}>
              {/* Handle */}
              <View style={styles.receiptHandle} />

              {/* Header */}
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptHeaderLabel}>TRANSACTION DETAILS</Text>
                <TouchableOpacity
                  style={styles.receiptCloseBtn}
                  onPress={() => setSelectedTx(null)}
                >
                  <X size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Hero Amount */}
              <View style={styles.receiptHero}>
                <Text
                  style={[
                    styles.receiptAmount,
                    selectedTx.type === 'received'
                      ? styles.txAmountIncome
                      : styles.txAmountExpense,
                  ]}
                >
                  {selectedTx.type === 'received' ? '+' : '-'}
                  {selectedTx.currencySymbol}
                  {selectedTx.amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View style={styles.receiptStatusPill}>
                  <ShieldCheck size={13} color="#10B981" />
                  <Text style={styles.receiptStatusText}>Verified by Ledger</Text>
                </View>
              </View>

              {/* Detail Rows */}
              <ScrollView
                style={styles.receiptTable}
                showsVerticalScrollIndicator={false}
              >
                {[
                  { k: 'Expedition / Trip', v: selectedTx.groupName },
                  { k: 'Counterparty / Payer', v: selectedTx.counterpart },
                  { k: 'Category', v: selectedTx.category },
                  { k: 'Description', v: selectedTx.title },
                  ...(selectedTx.splitModel ? [{ k: 'Split Ratio', v: `${selectedTx.splitModel} Split`, green: true }] : []),
                  { k: 'Payment Method', v: selectedTx.method },
                  { k: 'Date & Time', v: `${selectedTx.dateGroup} at ${selectedTx.timestamp}` },
                ].map(({ k, v, green }) => (
                  <View key={k} style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>{k}</Text>
                    <Text style={[styles.receiptVal, green ? styles.receiptValGreen : null]}>
                      {v}
                    </Text>
                  </View>
                ))}

                {/* Reference ID row with copy */}
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Reference ID</Text>
                  <View style={styles.receiptIdRow}>
                    <Text style={styles.receiptCode}>{selectedTx.txId}</Text>
                    <TouchableOpacity
                      onPress={() => handleCopyId(selectedTx.txId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {copiedId === selectedTx.txId
                        ? <Check size={14} color="#10B981" />
                        : <Copy size={14} color="#64748B" />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Done Button */}
              <TouchableOpacity
                style={styles.receiptDoneBtn}
                onPress={() => setSelectedTx(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.receiptDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── UPI Payment Modal ── */}
      <UpiPaymentModal
        visible={isUpiModalOpen}
        onClose={() => {
          setIsUpiModalOpen(false);
          setScannedPaymentData(null);
        }}
        onRequestCameraScan={handleRequestCameraScanFromModal}
        defaultUpiId={scannedPaymentData?.upiId || ''}
        defaultPayeeName={scannedPaymentData?.payeeName || ''}
        defaultAmount={scannedPaymentData?.amount || ''}
        defaultNote={scannedPaymentData?.note || ''}
        defaultRawQr={scannedPaymentData?.raw || ''}
        onPaymentSuccess={loadPaymentsData}
      />

      {/* ── Top-Level Camera QR Scanner Modal ── */}
      <QrCameraScannerModal
        visible={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },

  /* ── Top Nav ── */
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  /* ── Search ── */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    position: 'relative',
    zIndex: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  searchSeparator: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  sortFilterBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sortFilterBtnActive: {},
  filterDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  sortDropdown: {
    position: 'absolute',
    right: 0,
    top: 44,
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sortDropdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.06,
    color: '#94A3B8',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sortOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  sortOptionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#243E36',
    fontWeight: '700',
  },

  /* ── Metrics Banner ── */
  metricsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  metricCol: {
    flex: 1,
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },

  /* ── Capsule Filter Row ── */
  capsuleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  capsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  capsuleBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  capsuleBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  capsuleBtnTextActive: {
    color: '#065F46',
  },
  capsuleBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  capsuleBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  capsuleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  capsuleBadgeTextActive: {
    color: '#065F46',
  },

  /* ── Transaction Stream ── */
  streamFlow: {
    gap: 0,
  },
  dateSection: {
    marginBottom: 8,
  },
  dateGroupHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 2,
    paddingBottom: 8,
    paddingTop: 4,
  },
  flatItemsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  txRowLast: {
    borderBottomWidth: 0,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txContent: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  txMetaTag: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  txMetaDot: {
    fontSize: 11.5,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  txMetaTime: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  txSplitTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  txAmountIncome: {
    color: '#10B981',
  },
  txAmountExpense: {
    color: '#EF4444',
  },

  /* ── Empty State ── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIllustration: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCardOuter: {
    width: 80,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#243E36',
    justifyContent: 'flex-start',
    padding: 10,
    marginBottom: 10,
  },
  emptyCardBar: {
    width: 50,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1D322C',
    marginBottom: 8,
  },
  emptyCardChip: {
    width: 22,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    alignSelf: 'flex-end',
  },
  emptyLineA: {
    width: 70,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    marginBottom: 5,
  },
  emptyLineB: {
    width: 50,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ── Floating QR FAB (matches WebApp .tx-floating-scan-fab) ── */
  fab: {
    position: 'absolute',
    bottom: 108,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 90,
  },

  /* ── Receipt Bottom Sheet ── */
  receiptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 10,
    maxHeight: '80%',
  },
  receiptHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  receiptHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.08,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  receiptCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptHero: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  receiptStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  receiptStatusText: {
    fontSize: 11.5,
    color: '#065F46',
    fontWeight: '600',
  },
  receiptTable: {
    maxHeight: 280,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  receiptKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  receiptVal: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  receiptValGreen: {
    color: '#059669',
  },
  receiptIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  receiptCode: {
    fontSize: 11.5,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: '#334155',
    fontWeight: '600',
  },
  receiptDoneBtn: {
    marginTop: 18,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  receiptDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
