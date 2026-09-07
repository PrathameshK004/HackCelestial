import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Music,
  Coffee,
  Fuel,
  Activity,
  Home,
  Compass,
  Search,
  SlidersHorizontal,
  X,
  Check,
  Copy,
  ShieldCheck,
  Download,
  Plus,
  QrCode
} from 'lucide-react';
import { groupService } from '../services/group.service';
import { VendorUpiPaymentModal } from '../components/payment/VendorUpiPaymentModal';

interface PaymentsPageProps {
  onBack: () => void;
}

export interface TransactionItem {
  id: string;
  txId: string;
  title: string;
  category: string;
  note: string;
  dateGroup: 'Today' | 'Yesterday' | string;
  timestamp: string;
  type: 'received' | 'sent';
  amount: number;
  currencySymbol: string;
  counterpart: string;
  groupName: string;
  groupId?: string;
  method: string;
  iconType: 'income' | 'entertainment' | 'food' | 'transport' | 'health' | 'stay' | 'travel';
  status?: string;
  splitModel?: string;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onBack }) => {
  // Live Data States
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);

  // Filter & Sort States
  const [filterDirection, setFilterDirection] = useState<'all' | 'paid' | 'received'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest' | 'income' | 'expense'>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Record Payment Modal State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [autoStartCamera, setAutoStartCamera] = useState(false);

  // Load Real Data from PostgreSQL
  const loadPaymentsData = async () => {
    setIsLoading(true);
    try {
      const [paymentsRes, groupsRes] = await Promise.all([
        groupService.getUserPayments().catch(() => ({ data: { totalSpent: 0, totalReceived: 0, transactions: [] } })),
        groupService.getMyGroups().catch(() => ({ data: [] }))
      ]);

      if (paymentsRes?.data?.transactions) {
        setTransactions(paymentsRes.data.transactions);
        setTotalSpent(paymentsRes.data.totalSpent || 0);
        setTotalReceived(paymentsRes.data.totalReceived || 0);
      }

      if (groupsRes?.data && Array.isArray(groupsRes.data)) {
        setUserGroups(groupsRes.data);
      }
    } catch (err) {
      console.warn('Error loading payments ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const countAll = transactions.length;
  const countReceived = useMemo(() => transactions.filter((t) => t.type === 'received').length, [transactions]);
  const countPaid = useMemo(() => transactions.filter((t) => t.type === 'sent').length, [transactions]);

  // Sorting and Filtering
  const filteredAndSorted = useMemo(() => {
    let list = [...transactions];

    // Direction Filter (All, Paid, Received)
    if (filterDirection === 'paid') {
      list = list.filter((t) => t.type === 'sent');
    } else if (filterDirection === 'received') {
      list = list.filter((t) => t.type === 'received');
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          t.counterpart.toLowerCase().includes(q) ||
          t.groupName.toLowerCase().includes(q) ||
          t.txId.toLowerCase().includes(q)
      );
    }

    // Sort order
    switch (sortBy) {
      case 'highest':
        list.sort((a, b) => b.amount - a.amount);
        break;
      case 'lowest':
        list.sort((a, b) => a.amount - b.amount);
        break;
      case 'income':
        list = list.filter((t) => t.type === 'received');
        break;
      case 'expense':
        list = list.filter((t) => t.type === 'sent');
        break;
      case 'recent':
      default:
        // Preserves recent chronological order
        break;
    }

    return list;
  }, [transactions, filterDirection, sortBy, searchQuery]);

  // Group by Date for authentic sectioned mobile list
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: TransactionItem[] } = {};
    filteredAndSorted.forEach((item) => {
      const g = item.dateGroup;
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [filteredAndSorted]);

  const handleCopyId = (txId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(txId);
    setCopiedId(txId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Transaction ID,Title,Category,Note,Date,Type,Amount,Currency,Counterpart,Group,Method\n' +
      transactions
        .map(
          (p) =>
            `"${p.txId}","${p.title}","${p.category}","${p.note}","${p.dateGroup}","${p.type}","${p.amount}","${p.currencySymbol}","${p.counterpart}","${p.groupName}","${p.method}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Triptual_Transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortLabelMap = {
    recent: 'Recent',
    highest: 'Highest Amount',
    lowest: 'Lowest Amount',
    income: 'Income Only',
    expense: 'Expenses Only'
  };

  const renderIcon = (type: TransactionItem['iconType'], isIncome: boolean) => {
    switch (type) {
      case 'income':
        return (
          <div className="tx-icon-bubble" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
            <Briefcase size={18} strokeWidth={2} />
          </div>
        );
      case 'entertainment':
        return (
          <div className="tx-icon-bubble" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
            <Music size={18} strokeWidth={2} />
          </div>
        );
      case 'food':
        return (
          <div className="tx-icon-bubble" style={{ background: '#E0F2F1', color: '#00796B' }}>
            <Coffee size={18} strokeWidth={2} />
          </div>
        );
      case 'transport':
        return (
          <div className="tx-icon-bubble" style={{ background: '#ECEFF1', color: '#455A64' }}>
            <Fuel size={18} strokeWidth={2} />
          </div>
        );
      case 'health':
        return (
          <div className="tx-icon-bubble" style={{ background: '#E0F7FA', color: '#00838F' }}>
            <Activity size={18} strokeWidth={2} />
          </div>
        );
      case 'stay':
        return (
          <div className="tx-icon-bubble" style={{ background: '#FFF3E0', color: '#E65100' }}>
            <Home size={18} strokeWidth={2} />
          </div>
        );
      case 'travel':
      default:
        return (
          <div
            className="tx-icon-bubble"
            style={{
              background: isIncome ? '#E8F5E9' : '#F1F5F9',
              color: isIncome ? '#2E7D32' : '#475569'
            }}
          >
            <Compass size={18} strokeWidth={2} />
          </div>
        );
    }
  };

  return (
    <div className="tx-page-root animate-fade-in">
      <div className="tx-page-container">
        {/* Top Bar with Record Payment CTA */}
        <header className="tx-top-nav">
          <div className="tx-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="tx-back-arrow-btn"
                onClick={onBack}
                title="Back"
                aria-label="Back"
              >
                <ArrowLeft size={20} strokeWidth={2.2} />
              </button>
              <h1 className="tx-page-heading">Transactions</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="split-add-bill-btn"
                onClick={() => {
                  setAutoStartCamera(false);
                  setIsRecordPaymentOpen(true);
                }}
                style={{ margin: 0, padding: '7px 14px', fontSize: '0.78rem' }}
                title="Make or record a payment"
              >
                <Plus size={14} strokeWidth={2.4} />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                className="tx-back-arrow-btn"
                onClick={handleExportCSV}
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download size={18} color="#475569" />
              </button>
            </div>
          </div>
        </header>

        {/* Permanent Clean Search Box with Right-side Sorting Filter */}
        <div className="tx-search-box">
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            className="tx-search-input"
            placeholder="Search by title, note, or peer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <div
            style={{
              width: '1px',
              height: '18px',
              background: '#E2E8F0',
              margin: '0 2px'
            }}
          />

          <button
            type="button"
            className={`tx-search-filter-btn ${showSortMenu ? 'active' : ''}`}
            onClick={() => setShowSortMenu((prev) => !prev)}
            title={`Sort & Filter (${sortLabelMap[sortBy]})`}
            aria-label="Sort and filter transactions"
            aria-expanded={showSortMenu}
          >
            <SlidersHorizontal size={15} strokeWidth={2.2} />
            {sortBy !== 'recent' && <span className="tx-filter-dot" />}
          </button>

          {/* Integrated Sort & Filter Dropdown */}
          {showSortMenu && (
            <div className="tx-sort-dropdown">
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#94A3B8',
                  padding: '4px 10px 6px'
                }}
              >
                Sort & Filter
              </div>
              {(
                [
                  { id: 'recent', label: 'Recent' },
                  { id: 'highest', label: 'Highest Amount' },
                  { id: 'lowest', label: 'Lowest Amount' },
                  { id: 'income', label: 'Income Only (+)' },
                  { id: 'expense', label: 'Expenses Only (-)' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`tx-sort-option ${sortBy === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy(opt.id);
                    setShowSortMenu(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.id && <Check size={14} color="#243E36" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Ledger Metrics Summary */}
        <div style={{ display: 'flex', gap: '8px', margin: '4px 0 12px', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-light)', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Spent</span>
            <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#EF4444' }}>-₹{totalSpent.toLocaleString()}</span>
          </div>
          <div style={{ width: '1px', height: '22px', background: 'var(--border-light)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Received</span>
            <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#10B981' }}>+₹{totalReceived.toLocaleString()}</span>
          </div>
          <div style={{ width: '1px', height: '22px', background: 'var(--border-light)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</span>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#243E36' }}>{transactions.length} Verified</span>
          </div>
        </div>

        {/* Horizontal Capsule Filters Row matching mockup */}
        <div className="tx-capsule-row">
          <button
            type="button"
            className={`tx-capsule-btn ${filterDirection === 'all' ? 'active' : ''}`}
            onClick={() => setFilterDirection('all')}
          >
            <span>All</span>
            <span className="tx-capsule-badge">{countAll}</span>
          </button>

          <button
            type="button"
            className={`tx-capsule-btn ${filterDirection === 'paid' ? 'active' : ''}`}
            onClick={() => setFilterDirection('paid')}
          >
            <span>Paid</span>
            <span className="tx-capsule-badge">{countPaid}</span>
          </button>

          <button
            type="button"
            className={`tx-capsule-btn ${filterDirection === 'received' ? 'active' : ''}`}
            onClick={() => setFilterDirection('received')}
          >
            <span>Received</span>
            <span className="tx-capsule-badge">{countReceived}</span>
          </button>
        </div>

        {/* Sectioned Flat Transaction List */}
        {Object.keys(groupedTransactions).length > 0 ? (
          <div className="tx-stream-flow">
            {Object.entries(groupedTransactions).map(([dateGroup, items]) => (
              <section key={dateGroup} className="tx-date-group-section">
                <div className="tx-date-group-heading">{dateGroup}</div>

                <div className="tx-flat-items-list">
                  {items.map((tx) => {
                    const isIncome = tx.type === 'received';
                    return (
                      <div
                        key={tx.id}
                        className="tx-flat-row"
                        onClick={() => setSelectedTx(tx)}
                        role="button"
                        tabIndex={0}
                      >
                        {/* Soft Circle Category Icon */}
                        {renderIcon(tx.iconType, isIncome)}

                        {/* Middle Info Column */}
                        <div className="tx-flat-content">
                          <div className="tx-flat-title-line">
                            <span className="tx-flat-title">{tx.title}</span>
                          </div>

                          <div className="tx-flat-meta-line">
                            <span className="tx-flat-meta-tag">{tx.groupName || tx.category}</span>
                            <span className="tx-flat-dot">·</span>
                            <span className="tx-flat-timestamp">{tx.timestamp}</span>
                            {tx.splitModel && (
                              <>
                                <span className="tx-flat-dot">·</span>
                                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                                  {tx.splitModel} split
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount on Far Right */}
                        <div
                          className={`tx-flat-amount ${
                            isIncome ? 'amount-income' : 'amount-expense'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {tx.currencySymbol}
                          {tx.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Cardless Minimalist Empty State */
          <div className="tx-empty-state">
            <svg
              className="tx-empty-illustration"
              width="100"
              height="80"
              viewBox="0 0 112 92"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ margin: '0 auto', display: 'block' }}
            >
              <rect x="18" y="10" width="76" height="54" rx="10" fill="#243E36" />
              <path d="M18 22H94" stroke="#1D322C" strokeWidth="2" />
              <rect x="68" y="27" width="26" height="20" rx="6" fill="#CBD5E1" />
              <circle cx="78" cy="37" r="3.5" fill="#FFFFFF" />
              <rect x="22" y="74" width="68" height="3.5" rx="1.75" fill="#94A3B8" />
              <rect x="32" y="81" width="48" height="3.5" rx="1.75" fill="#CBD5E1" />
            </svg>

            <h2 className="tx-empty-title">
              {isLoading ? 'Loading payment records...' : 'No transactions recorded yet'}
            </h2>
            <p className="tx-empty-sub">
              {isLoading
                ? 'Retrieving your real-time PostgreSQL payment and settlement ledger...'
                : 'Expedition expenses and peer settlements will be tracked here in real-time.'}
            </p>
          </div>
        )}

        {/* Floating Scanner Action Button (Bottom Right) */}
        <button
          type="button"
          className="tx-floating-scan-fab"
          onClick={() => {
            setAutoStartCamera(true);
            setIsRecordPaymentOpen(true);
          }}
          title="Scan Vendor QR Code"
          aria-label="Scan Vendor QR Code"
        >
          <QrCode size={21} color="#243E36" strokeWidth={2.2} />
        </button>
      </div>

      {/* ---------------- VENDOR UPI & SCAN PAYMENT GATEWAY MODAL ---------------- */}
      <VendorUpiPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        userGroups={userGroups}
        onPaymentSuccess={loadPaymentsData}
        autoStartCamera={autoStartCamera}
      />

      {/* ---------------- TRANSACTION RECEIPT MODAL (Apple/Stripe Sheet) ---------------- */}
      {selectedTx && (
        <div
          className="payment-receipt-sheet-backdrop"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="payment-receipt-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payment-receipt-handle" />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#64748B'
                }}
              >
                Transaction Details
              </span>

              <button
                type="button"
                className="payment-receipt-close"
                onClick={() => setSelectedTx(null)}
                title="Close receipt"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Hero Amount Section */}
            <div className="payment-receipt-hero">
              <div
                className={`payment-receipt-amount ${
                  selectedTx.type === 'received' ? 'amount-income' : 'amount-expense'
                }`}
              >
                {selectedTx.type === 'received' ? '+' : '-'}
                {selectedTx.currencySymbol}
                {selectedTx.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>

              <div className="payment-receipt-status-pill">
                <ShieldCheck size={14} color="#10B981" />
                <span>Verified by PostgreSQL Ledger</span>
              </div>
            </div>

            {/* Breakdown Rows */}
            <div className="payment-receipt-table">
              <div className="payment-receipt-row">
                <span className="receipt-k">Expedition / Trip</span>
                <span className="receipt-v" style={{ fontWeight: 700 }}>
                  {selectedTx.groupName}
                </span>
              </div>

              <div className="payment-receipt-row">
                <span className="receipt-k">Counterparty / Payer</span>
                <span className="receipt-v">{selectedTx.counterpart}</span>
              </div>

              <div className="payment-receipt-row">
                <span className="receipt-k">Category</span>
                <span className="receipt-v">{selectedTx.category}</span>
              </div>

              <div className="payment-receipt-row">
                <span className="receipt-k">Description</span>
                <span className="receipt-v">{selectedTx.title}</span>
              </div>

              {selectedTx.splitModel && (
                <div className="payment-receipt-row">
                  <span className="receipt-k">Split Ratio</span>
                  <span className="receipt-v" style={{ color: '#059669', fontWeight: 600 }}>
                    {selectedTx.splitModel} Split
                  </span>
                </div>
              )}

              <div className="payment-receipt-row">
                <span className="receipt-k">Payment Method</span>
                <span className="receipt-v">{selectedTx.method}</span>
              </div>

              <div className="payment-receipt-row">
                <span className="receipt-k">Date & Time</span>
                <span className="receipt-v">
                  {selectedTx.dateGroup} at {selectedTx.timestamp}
                </span>
              </div>

              <div className="payment-receipt-row">
                <span className="receipt-k">Reference ID</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontSize: '0.78rem', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                    {selectedTx.txId}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedTx.txId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                    title="Copy Reference"
                  >
                    {copiedId === selectedTx.txId ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Receipt Footer Action */}
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="tx-bottom-cta"
                onClick={() => setSelectedTx(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
