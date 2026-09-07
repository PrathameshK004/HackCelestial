import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  HelpCircle,
  MessageCircle,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Send
} from 'lucide-react';

interface HelpSupportPageProps {
  onBack: () => void;
}

interface FAQItem {
  id: string;
  category: 'expenses' | 'groups' | 'payments' | 'security';
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'expenses',
    q: 'How does the Triptual AI debt minimization algorithm work?',
    a: 'Triptual computes a mathematical directed graph of all pairwise obligations and eliminates redundant intermediate transactions. For example, if Member A owes B $50 and B owes C $50, the algorithm collapses this into a single direct payment from A to C, saving over 70% in transfer volume and banking friction.'
  },
  {
    id: 'faq-2',
    category: 'payments',
    q: 'How are UPI & QR code payments verified?',
    a: 'When you tap "Settle via UPI", Triptual generates a deep-linked payment intent pre-filled with the exact amount and the receiver verified UPI VPA. After approval in your banking app, the ledger marks the debt loop as closed with a unique cryptographic reference.'
  },
  {
    id: 'faq-3',
    category: 'groups',
    q: 'Can travelers who don’t have an account join my group?',
    a: 'Yes! When you create an expedition group, an automatic magic invite link is generated. Travelers can join via web without passwords, view their live share of the bill, and scan QR codes directly from any mobile browser.'
  },
  {
    id: 'faq-4',
    category: 'expenses',
    q: 'Can we split expenses unequally or by percentage weights?',
    a: 'Absolutely. During expense creation or in the group ledger settings, switch the split mode from "Equal (1/N)" to "Weighted Ratios" or "Custom Shares" to adjust for different accommodation room sizes or individual dining orders.'
  },
  {
    id: 'faq-5',
    category: 'security',
    q: 'Are our financial records and UPI IDs encrypted?',
    a: 'Yes. All communication is secured via end-to-end TLS 1.3 encryption. UPI VPAs and settlement audits are stored using bank-grade AES-256 encryption with strict zero-knowledge access controls.'
  }
];

export const HelpSupportPage: React.FC<HelpSupportPageProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  // Contact form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const filteredFaqs = FAQS.filter((f) => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSubmitted(true);
      setTicketSubject('');
      setTicketMessage('');
      setTimeout(() => setTicketSubmitted(false), 5000);
    }, 800);
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <button
            type="button"
            className="btn-back-transparent"
            onClick={onBack}
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft size={22} color="var(--text-primary)" />
          </button>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.2rem',
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.2
            }}
          >
            Help & Support
          </h1>
        </div>

        {/* Hero Search Box */}
        <div className="clean-section-card" style={{ padding: '16px 14px', marginBottom: '16px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            How can we assist you today?
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Search articles on group trip setup, ratios, UPI settlements, and audit logs.
          </p>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="styled-text-input"
              placeholder="Search help topics, keywords, or error codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '36px',
                fontSize: '0.78rem',
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-surface-warm)'
              }}
            />
          </div>
        </div>

        {/* 3 Direct Support Channels */}
        <div className="expense-split-hero-strip" style={{ marginBottom: '16px' }}>
          <div className="expense-metric-card" style={{ cursor: 'pointer', padding: '14px 14px' }} onClick={() => window.open('https://wa.me/15551234567', '_blank')}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>WhatsApp Desk</span>
              <MessageCircle size={15} color="var(--accent-emerald)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '1.05rem' }}>
              Instant Chat
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Response under 2 min</div>
          </div>

          <div className="expense-metric-card" style={{ cursor: 'pointer', padding: '14px 14px' }} onClick={() => window.location.href = 'mailto:support@triptual.com'}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Email Desk</span>
              <Mail size={15} color="var(--accent-olive)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
              support@triptual.com
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Priority organizer desk</div>
          </div>

          <div className="expense-metric-card" style={{ padding: '14px 14px' }}>
            <div className="expense-metric-header">
              <span className="expense-metric-title" style={{ fontSize: '0.7rem' }}>Zero Dispute Guarantee</span>
              <ShieldCheck size={15} color="var(--accent-amber)" />
            </div>
            <div className="expense-metric-val" style={{ fontSize: '1.05rem' }}>
              Audited Ledger
            </div>
            <div className="expense-metric-sub" style={{ fontSize: '0.7rem' }}>Exportable proof statements</div>
          </div>
        </div>

        {/* Vertical Stack: FAQs & Ticket Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {/* Card 1: FAQs */}
          <div className="clean-section-card" style={{ padding: '16px 14px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                Frequently Asked Questions
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Instant answers to top organizer inquiries.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="category-pills-bar" style={{ padding: 0, marginBottom: '12px' }}>
              {[
                { id: 'all', label: 'All Topics' },
                { id: 'expenses', label: 'Split Engine' },
                { id: 'payments', label: 'UPI & Payments' },
                { id: 'groups', label: 'Trips & Invites' },
                { id: 'security', label: 'Security' }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`category-pill ${activeCategory === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(c.id)}
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      background: isOpen ? 'var(--bg-surface-warm)' : 'transparent',
                      overflow: 'hidden',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={15} color="var(--accent-olive)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 12px 12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)' }}>
                  <HelpCircle size={28} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.78rem' }}>No FAQ articles matched your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Submit Support Ticket Form */}
          <div className="clean-section-card" style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                  Submit a Ticket
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Direct inquiry to our engineering & travel desk.
                </p>
              </div>
              <FileText size={16} color="var(--accent-olive)" />
            </div>

            {ticketSubmitted && (
              <div style={{ padding: '8px 10px', background: 'rgba(70, 75, 41, 0.1)', color: 'var(--accent-olive)', borderRadius: 'var(--radius-md)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <CheckCircle2 size={16} />
                <span>Ticket #TRIP-8842 submitted! We will reply within 4 hours.</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Issue Category
                </label>
                <select
                  className="styled-select-input"
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '8px 10px', background: 'var(--bg-surface-warm)' }}
                >
                  <option value="split">Settlement Calculation Query</option>
                  <option value="upi">UPI Payment Confirmation</option>
                  <option value="invite">Invite Link & Traveler Access</option>
                  <option value="bug">Report Visual or UI Issue</option>
                  <option value="other">General Feedback / Request</option>
                </select>
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  className="styled-text-input"
                  placeholder="e.g. Unbalanced split in Goa trip"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '8px 10px', background: 'var(--bg-surface-warm)' }}
                  required
                />
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Detailed Description
                </label>
                <textarea
                  className="styled-text-input"
                  rows={3}
                  placeholder="Please describe the issue, group trip name, or steps to reproduce..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '8px 10px', background: 'var(--bg-surface-warm)', resize: 'vertical' }}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary-luxury"
                disabled={isSubmitting}
                style={{ width: '100%', justifyContent: 'center', padding: '9px 14px', fontSize: '0.78rem', marginTop: '2px', boxSizing: 'border-box' }}
              >
                <Send size={13} />
                <span>{isSubmitting ? 'Submitting Ticket...' : 'Send to Support Desk'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
