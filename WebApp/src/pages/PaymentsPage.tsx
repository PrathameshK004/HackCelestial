import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Search,
  Share2,
  Check,
  Zap,
  Receipt
} from 'lucide-react';

interface PaymentsPageProps {
  onBack: () => void;
}

interface PaymentRecord {
  id: string;
  txId: string;
  type: 'sent' | 'received';
  amount: number;
  currencySymbol: string;
  counterpart: string;
  groupName: string;
  method: 'UPI (GPay)' | 'UPI (PhonePe)' | 'Bank IMPS' | 'Cash Handover';
  date: string;
  time: string;
  status: 'Completed' | 'Processing';
}

const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    txId: 'UPI-9837241289',
    type: 'sent',
    amount: 2200,
    currencySymbol: '₹',
    counterpart: 'Sneha Patil',
    groupName: 'Goa Friends Getaway',
    method: 'UPI (GPay)',
    date: '27 Aug 2026',
    time: '14:22',
    status: 'Completed'
  },
  {
    id: 'pay-2',
    txId: 'UPI-7812903451',
    type: 'received',
    amount: 3200,
    currencySymbol: '₹',
    counterpart: 'Rahul Sharma',
    groupName: 'Goa Friends Getaway',
    method: 'UPI (PhonePe)',
    date: '26 Aug 2026',
    time: '19:45',
    status: 'Completed'
  },
  {
    id: 'pay-3',
    txId: 'IMPS-4491823901',
    type: 'sent',
    amount: 1500,
    currencySymbol: '₹',
    counterpart: 'Vikram Mehta',
    groupName: 'Manali Altitude Trek',
    method: 'Bank IMPS',
    date: '24 Aug 2026',
    time: '11:10',
    status: 'Completed'
  },
  {
    id: 'pay-4',
    txId: 'CASH-991209381',
    type: 'received',
    amount: 850,
    currencySymbol: '₹',
    counterpart: 'Aditya Kulkarni',
    groupName: 'Goa Friends Getaway',
    method: 'Cash Handover',
    date: '22 Aug 2026',
    time: '16:30',
    status: 'Completed'
  },
  {
    id: 'pay-5',
    txId: 'UPI-1192834012',
    type: 'sent',
    amount: 450,
    currencySymbol: '$',
    counterpart: 'Amit Patel',
    groupName: 'Bali Tropical Retreat',
    method: 'Bank IMPS',
    date: '16 Jul 2026',
    time: '10:00',
    status: 'Completed'
  }
];

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onBack }) => {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPayments = MOCK_PAYMENTS.filter((pay) => {
    if (filterType !== 'all' && pay.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        pay.counterpart.toLowerCase().includes(q) ||
        pay.groupName.toLowerCase().includes(q) ||
        pay.txId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSent = MOCK_PAYMENTS.filter((p) => p.type === 'sent').reduce(
    (acc, cur) => acc + cur.amount,
    0
  );
  const totalReceived = MOCK_PAYMENTS.filter((p) => p.type === 'received').reduce(
    (acc, cur) => acc + cur.amount,
    0
  );

  const handleCopyId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedId(txId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Transaction ID,Type,Amount,Currency,Counterpart,Group,Method,Date,Time,Status\n' +
      MOCK_PAYMENTS.map(
        (p) =>
          `"${p.txId}","${p.type}","${p.amount}","${p.currencySymbol}","${p.counterpart}","${p.groupName}","${p.method}","${p.date}","${p.time}","${p.status}"`
      ).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Triptual_Payment_History.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-icon-circle"
              onClick={onBack}
              title="Back"
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

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.35rem',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              Payment History
            </h1>
          </div>

          <button
            type="button"
            className="profile-header-icon-btn"
            onClick={handleExportCSV}
            title="Export CSV Statement"
            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
          >
            <Download size={13} />
            <span>CSV Export</span>
          </button>
        </div>

        {/* Hero Financial Summary Strip */}
        <div className="expense-split-hero-strip" style={{ marginBottom: '16px' }}>
          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Total Collected</span>
              <ArrowDownLeft size={14} color="var(--accent-olive)" />
            </div>
            <div className="expense-metric-val" style={{ color: 'var(--accent-olive)', fontSize: '1.3rem' }}>
              +₹{totalReceived.toLocaleString()}
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Received across groups</div>
          </div>

          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Total Paid Out</span>
              <ArrowUpRight size={14} color="var(--accent-rose)" />
            </div>
            <div className="expense-metric-val" style={{ color: 'var(--accent-rose)', fontSize: '1.3rem' }}>
              -₹{totalSent.toLocaleString()}
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Settled via UPI / Bank</div>
          </div>

          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Linked UPI VPA</span>
              <Zap size={14} color="var(--accent-amber)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '1.05rem', wordBreak: 'break-all' }}>
              yogesh@oksbi
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Instant QR ready</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="clean-section-card" style={{ padding: '14px 14px', marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="profile-input-field"
                placeholder="Search by name, trip group, or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '0.78rem', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Filter Pills */}
            <div className="category-pills-bar" style={{ padding: 0, margin: 0 }}>
              {(['all', 'received', 'sent'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`category-pill ${filterType === type ? 'active' : ''}`}
                  onClick={() => setFilterType(type)}
                  style={{ padding: '4px 12px', fontSize: '0.74rem' }}
                >
                  <span>
                    {type === 'all'
                      ? `All Records (${MOCK_PAYMENTS.length})`
                      : type === 'received'
                      ? 'Received'
                      : 'Paid Out'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPayments.map((pay) => {
            const isSent = pay.type === 'sent';
            return (
              <div
                key={pay.id}
                className="expense-item-row"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  border: '1px solid var(--border-light)'
                }}
              >
                {/* Left: Direction Icon & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isSent ? 'var(--accent-rose-subtle)' : 'var(--accent-emerald-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {isSent ? (
                      <ArrowUpRight size={16} color="var(--accent-rose)" />
                    ) : (
                      <ArrowDownLeft size={16} color="var(--accent-emerald)" />
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {isSent ? `Paid to ${pay.counterpart}` : `Received from ${pay.counterpart}`}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          background: 'var(--bg-surface-warm)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {pay.method}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{pay.groupName}</span>
                      <span>·</span>
                      <span>{pay.date}, {pay.time}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Ref ID Copy */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: isSent ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                    }}
                  >
                    {isSent ? '-' : '+'}{pay.currencySymbol}{pay.amount.toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyId(pay.txId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginTop: '2px',
                      fontSize: '0.66rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Click to copy Transaction ID"
                  >
                    {copiedId === pay.txId ? (
                      <>
                        <Check size={10} color="var(--accent-emerald)" />
                        <span style={{ color: 'var(--accent-emerald)' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={10} />
                        <span>{pay.txId.slice(0, 10)}...</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredPayments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.8rem' }}>No payment transactions match your query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
