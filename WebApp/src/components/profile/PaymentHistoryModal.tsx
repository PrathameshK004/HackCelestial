import React, { useState } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Search,
  CheckCircle2
} from 'lucide-react';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const filtered = MOCK_PAYMENTS.filter((p) => {
    const matchType = filterType === 'all' || p.type === filterType;
    const matchQuery =
      p.counterpart.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.txId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchQuery;
  });

  const totalSent = MOCK_PAYMENTS.filter((p) => p.type === 'sent').reduce((a, b) => a + b.amount, 0);
  const totalReceived = MOCK_PAYMENTS.filter((p) => p.type === 'received').reduce((a, b) => a + b.amount, 0);

  const handleDownloadReceipt = (id: string) => {
    setDownloadedId(id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card payment-history-modal-card">
        {/* Top Header */}
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Financial Audit Trail</span>
            <h3 className="modal-main-title">Settlement & Payment History</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-inner-scroll-body">
          {/* Summary Strip */}
          <div className="payment-summary-strip">
            <div className="summary-stat-box">
              <span className="summary-stat-label">Total Settlements Received</span>
              <span className="summary-stat-val text-emerald">+₹{totalReceived.toLocaleString()}</span>
            </div>
            <div className="summary-stat-box">
              <span className="summary-stat-label">Total Settlements Paid</span>
              <span className="summary-stat-val text-rose">-₹{totalSent.toLocaleString()}</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="payment-filter-bar">
            <div className="payment-search-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="styled-search-input py-sm"
                placeholder="Search recipient, trip, or TxID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="payment-type-pills">
              <button
                type="button"
                className={`type-pill ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`type-pill ${filterType === 'received' ? 'active' : ''}`}
                onClick={() => setFilterType('received')}
              >
                Received
              </button>
              <button
                type="button"
                className={`type-pill ${filterType === 'sent' ? 'active' : ''}`}
                onClick={() => setFilterType('sent')}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="payment-tx-list">
            {filtered.length === 0 ? (
              <div className="empty-tx-box">
                <p>No payment transactions found matching your filter.</p>
              </div>
            ) : (
              filtered.map((tx) => {
                const isSent = tx.type === 'sent';
                return (
                  <div key={tx.id} className="payment-tx-item">
                    <div className="tx-item-left">
                      <div className={`tx-icon-circle ${isSent ? 'icon-sent' : 'icon-received'}`}>
                        {isSent ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                      </div>

                      <div className="tx-meta-info">
                        <div className="tx-main-line">
                          <span className="tx-person-name">
                            {isSent ? `Paid to ${tx.counterpart}` : `Received from ${tx.counterpart}`}
                          </span>
                          <span className="tx-status-tag">
                            <CheckCircle2 size={12} /> {tx.status}
                          </span>
                        </div>
                        <div className="tx-sub-line">
                          <span>{tx.groupName}</span>
                          <span className="dot-divider">•</span>
                          <span>{tx.method}</span>
                          <span className="dot-divider">•</span>
                          <span>{tx.date} at {tx.time}</span>
                        </div>
                        <div className="tx-id-line">Ref: {tx.txId}</div>
                      </div>
                    </div>

                    <div className="tx-item-right">
                      <div className={`tx-amount-display ${isSent ? 'amount-sent' : 'amount-received'}`}>
                        {isSent ? '-' : '+'}
                        {tx.currencySymbol}
                        {tx.amount.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        className="btn-download-receipt"
                        onClick={() => handleDownloadReceipt(tx.id)}
                        title="Download Tax / UPI Receipt"
                      >
                        {downloadedId === tx.id ? (
                          <span className="text-emerald text-xs font-semibold">Downloaded!</span>
                        ) : (
                          <>
                            <Download size={13} />
                            <span>Receipt</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-bottom-actions px-24 pb-20">
          <button type="button" className="btn-confirm-settlement" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
