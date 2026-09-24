import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Mail,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  CheckCheck,
  Send,
  Paperclip,
  Eye,
  Download,
  X,
  ExternalLink,
  Plus,
  Clock,
  Sparkles,
  Copy,
  Check,
  FileIcon
} from 'lucide-react';
import {
  createSupportTicket,
  listSupportTickets,
  updateSupportTicketStatus,
  getTicketMessages,
  sendTicketMessage,
  getTicketAttachmentUrl,
  SupportTicketSummary,
  TicketMessage
} from '../services/support.service';

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
    a: 'Triptual computes a mathematical directed graph of all pairwise obligations and eliminates redundant intermediate transactions. For example, if Member A owes B ₹500 and B owes C ₹500, the algorithm collapses this into a single direct payment from A to C, saving over 70% in transfer volume and banking friction.'
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
  // Navigation tabs: 'tickets' | 'new-ticket' | 'faqs'
  const [activeTab, setActiveTab] = useState<'tickets' | 'new-ticket' | 'faqs'>('tickets');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [ticketSearch, setTicketSearch] = useState('');

  // FAQs state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  // New Ticket Form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('split');
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [ticketError, setTicketError] = useState('');
  const [createdTicketNumber, setCreatedTicketNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // Tickets List State
  const [myTickets, setMyTickets] = useState<SupportTicketSummary[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [updatingTicketNumber, setUpdatingTicketNumber] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  // Dedicated Chat State
  const [activeChatTicket, setActiveChatTicket] = useState<SupportTicketSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatDraftText, setChatDraftText] = useState('');
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Document Viewer Lightbox State
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    ticketNumber: string;
    isImage: boolean;
  } | null>(null);

  // Load user tickets on mount
  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const tickets = await listSupportTickets();
      setMyTickets(tickets);
    } catch (err) {
      console.warn('Could not load support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeChatTicket && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeChatTicket]);

  // Handle Mark Ticket as Solved
  const handleMarkAsSolved = async (ticketNumber: string) => {
    setUpdatingTicketNumber(ticketNumber);
    try {
      const updated = await updateSupportTicketStatus(ticketNumber, 'RESOLVED');
      setMyTickets((prev) =>
        prev.map((t) => (t.ticketNumber === ticketNumber ? { ...t, status: 'RESOLVED' } : t))
      );
      if (activeChatTicket && activeChatTicket.ticketNumber === ticketNumber) {
        setActiveChatTicket((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            ticketId: updated.id || '',
            senderId: 'sys',
            senderName: 'System',
            senderRole: 'SYSTEM',
            message: 'Ticket was marked as solved.',
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'Could not mark ticket as solved. Please try again.');
    } finally {
      setUpdatingTicketNumber(null);
    }
  };

  // Handle opening dedicated chat
  const handleOpenChat = async (ticket: SupportTicketSummary) => {
    setActiveChatTicket(ticket);
    setIsLoadingMessages(true);
    setChatMessages([]);
    try {
      const res = await getTicketMessages(ticket.ticketNumber);
      setChatMessages(res.messages || []);
      if (res.ticket) {
        setActiveChatTicket(res.ticket);
      }
    } catch (err) {
      console.warn('Could not load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handle sending a chat message with optional document upload to AWS S3
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatTicket) return;
    if (!chatDraftText.trim() && !chatAttachment) return;

    setIsSendingMessage(true);
    const pendingText = chatDraftText.trim();
    const pendingFile = chatAttachment;

    try {
      const newMsg = await sendTicketMessage(activeChatTicket.ticketNumber, pendingText, pendingFile);
      setChatMessages((prev) => [...prev, newMsg]);
      setChatDraftText('');
      setChatAttachment(null);

      // If the ticket was resolved, sending a message reopens it
      if (activeChatTicket.status === 'RESOLVED') {
        setActiveChatTicket((prev) => (prev ? { ...prev, status: 'OPEN' } : null));
        setMyTickets((prev) =>
          prev.map((t) => (t.ticketNumber === activeChatTicket.ticketNumber ? { ...t, status: 'OPEN' } : t))
        );
      }

      // Concierge auto-acknowledgment after 1.2s
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `concierge-${Date.now()}`,
            ticketId: activeChatTicket.id || '',
            senderId: 'support-agent',
            senderName: 'Triptual Concierge Desk',
            senderRole: 'SUPPORT',
            message:
              'Thank you for your update. Our senior concierge engineers have received your message and attached documents. We will looking into Issue and get back to you shortly.',
            createdAt: new Date().toISOString()
          }
        ]);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle ticket submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setIsSubmitting(true);
    setTicketError('');

    try {
      const response = await createSupportTicket({
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage,
        attachment: ticketAttachment
      });

      setCreatedTicketNumber(response.ticketNumber);
      const newTicketEntry: SupportTicketSummary = {
        ticketNumber: response.ticketNumber,
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        status: 'OPEN',
        attachmentName: ticketAttachment?.name || null,
        attachmentUrl: response.attachmentUrl || null,
        createdAt: response.createdAt || new Date().toISOString()
      };

      setMyTickets((previous) => [newTicketEntry, ...previous]);
      setIsSubmitting(false);
      setTicketSubmitted(true);
      setTicketSubject('');
      setTicketMessage('');
      setTicketAttachment(null);
    } catch (err: any) {
      setTicketError(err.message || 'Could not submit your ticket. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Helper to open document preview lightbox
  const openDocPreview = (ticketNumber: string, docName: string, directUrl?: string | null) => {
    const url = getTicketAttachmentUrl(ticketNumber, directUrl);
    const isImage = /\.(jpe?g|png|webp|gif)$/i.test(docName) || directUrl?.includes('image');
    setPreviewDoc({
      url,
      name: docName,
      ticketNumber,
      isImage: Boolean(isImage)
    });
  };

  const copyTicketId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedTicketId(id);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  // Filtered tickets
  const filteredTickets = myTickets.filter((ticket) => {
    if (ticketFilter === 'open' && ticket.status === 'RESOLVED') return false;
    if (ticketFilter === 'resolved' && ticket.status !== 'RESOLVED') return false;
    if (ticketSearch.trim()) {
      const q = ticketSearch.toLowerCase();
      return (
        ticket.ticketNumber.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openTicketCount = myTickets.filter((t) => t.status !== 'RESOLVED').length;

  // Filtered FAQs
  const filteredFaqs = FAQS.filter((f) => {
    if (activeFaqCategory !== 'all' && f.category !== activeFaqCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div className="profile-page-container" style={{ maxWidth: '720px', padding: '14px 16px 50px' }}>

        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-back-transparent"
              onClick={onBack}
              title="Go back"
              aria-label="Back"
            >
              <ArrowLeft size={22} color="var(--text-primary)" />
            </button>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2
                }}
              >
                Help & Concierge Support
              </h1>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Dedicated 24/7 organizer assistance & ticket resolution
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot-green" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-olive)' }}>
              Live Desk
            </span>
          </div>
        </div>

        {/* Hero Banner (Home Page Deep Olive Palette with Chartreuse Badge) */}
        <div className="support-hero-header">
          <div className="support-hero-badge">
            <Sparkles size={13} />
            <span>Concierge Desk</span>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.35rem',
              fontWeight: 700,
              margin: '0 0 6px 0',
              lineHeight: 1.25,
              color: '#FFFFFF'
            }}
          >
            How can we assist your journey today?
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.45 }}>
            Submit tickets with attachments, chat with engineering support, or explore our guides on group splitting and UPI settlement loops.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('new-ticket');
                setTicketSubmitted(false);
              }}
              style={{
                background: 'var(--badge-match-bg)',
                color: 'var(--badge-match-text)',
                border: '1px solid var(--badge-match-border)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(229, 236, 104, 0.25)'
              }}
            >
              <Plus size={15} />
              <span>Raise Support Ticket</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={14} />
              <span>View My Tickets ({openTicketCount} Open)</span>
            </button>
          </div>
        </div>

        {/* 3 Interactive Quick Channels (Home Page Warm Theme) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            marginBottom: '18px'
          }}
        >
          <div
            onClick={() => window.open('https://wa.me/919876543210?text=Hi%20Triptual%20Support,%20I%20need%20help.', '_blank')}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <div style={{ background: 'var(--accent-olive-subtle)', padding: '8px', borderRadius: '50%', color: 'var(--accent-olive)' }}>
              <MessageCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>Chat Support Live</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Instant reply &lt; 2 min</div>
            </div>
          </div>

          <div
            onClick={() => (window.location.href = 'mailto:triptual.support@gmail.com')}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <div style={{ background: 'var(--bg-surface-warm)', padding: '8px', borderRadius: '50%', color: 'var(--accent-olive)' }}>
              <Mail size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>Email Concierge</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>triptual.support@gmail.com</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <div style={{ background: '#FEF3C7', padding: '8px', borderRadius: '50%', color: '#D97706' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>Zero Dispute</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Cryptographic audit log</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Home Page Styled Pills Bar) */}
        <div className="support-tabs-bar">
          <button
            type="button"
            className={`support-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <FileText size={14} />
            <span>My Tickets</span>
            {myTickets.length > 0 && <span className="support-tab-count">{myTickets.length}</span>}
          </button>

          <button
            type="button"
            className={`support-tab-btn ${activeTab === 'new-ticket' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('new-ticket');
              setTicketSubmitted(false);
            }}
          >
            <Plus size={14} />
            <span>Raise a Ticket</span>
          </button>

          <button
            type="button"
            className={`support-tab-btn ${activeTab === 'faqs' ? 'active' : ''}`}
            onClick={() => setActiveTab('faqs')}
          >
            <HelpCircle size={14} />
            <span>FAQs & Guides</span>
          </button>
        </div>

        {/* TAB 1: MY TICKETS */}
        {activeTab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search and Filters */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: 'var(--bg-surface)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              <div style={{ position: 'relative', width: '100%' }}>
                <Search
                  size={15}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search by Ticket ID (e.g. TICKET-...), subject, or issue..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-surface-warm)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
                {[
                  { id: 'all', label: `All (${myTickets.length})` },
                  { id: 'open', label: `Open (${myTickets.filter((t) => t.status !== 'RESOLVED').length})` },
                  { id: 'resolved', label: `Solved (${myTickets.filter((t) => t.status === 'RESOLVED').length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTicketFilter(f.id as any)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: ticketFilter === f.id ? '1px solid var(--accent-olive)' : '1px solid var(--border-card)',
                      background: ticketFilter === f.id ? 'var(--accent-olive)' : 'var(--bg-surface-warm)',
                      color: ticketFilter === f.id ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket List */}
            {isLoadingTickets ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                <Clock size={28} style={{ margin: '0 auto 8px', animation: 'spin 2s linear infinite' }} />
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Loading your support tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '36px 16px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--accent-olive-subtle)',
                    color: 'var(--accent-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}
                >
                  <FileText size={24} />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 4px 0'
                  }}
                >
                  {ticketSearch ? 'No matching tickets found' : 'No tickets raised yet'}
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 16px 0', maxWidth: '380px', marginInline: 'auto' }}>
                  {ticketSearch
                    ? 'Try adjusting your search terms or filter.'
                    : 'Encountered a settlement calculation discrepancy or payment verification delay? Raise a ticket and our team will look into it promptly.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('new-ticket');
                    setTicketSubmitted(false);
                  }}
                  className="btn-ticket-chat"
                >
                  <Plus size={14} />
                  <span>Raise a Support Ticket</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTickets.map((ticket) => {
                  const isSolved = ticket.status === 'RESOLVED';
                  const hasDoc = Boolean(ticket.attachmentName || ticket.attachmentUrl);
                  const isUpdating = updatingTicketNumber === ticket.ticketNumber;

                  return (
                    <div key={ticket.ticketNumber} className={`ticket-card ${isSolved ? 'is-solved' : ''}`}>
                      {/* Top Row: Ticket ID, Date, Status */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            className="ticket-id-tag"
                            onClick={() => copyTicketId(ticket.ticketNumber)}
                            style={{ cursor: 'pointer' }}
                            title="Click to copy Ticket ID"
                          >
                            <span>{ticket.ticketNumber}</span>
                            {copiedTicketId === ticket.ticketNumber ? (
                              <Check size={12} color="var(--accent-olive)" />
                            ) : (
                              <Copy size={12} color="var(--text-muted)" />
                            )}
                          </span>

                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isSolved ? (
                          <span className="ticket-status-resolved">
                            <CheckCheck size={12} color="var(--accent-olive)" />
                            <span>SOLVED</span>
                          </span>
                        ) : (
                          <span className="ticket-status-open">
                            <span className="pulse-dot-green" />
                            <span>{ticket.status || 'OPEN'}</span>
                          </span>
                        )}
                      </div>

                      {/* Middle: Subject & Description */}
                      <h3
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '0.96rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: '0 0 4px 0',
                          lineHeight: 1.3
                        }}
                      >
                        {ticket.subject}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          margin: '0 0 10px 0',
                          lineHeight: 1.45
                        }}
                      >
                        {ticket.message}
                      </p>

                      {/* Category tag */}
                      <div style={{ marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg-surface-subtle)',
                            color: 'var(--accent-olive)',
                            border: '1px solid var(--border-light)',
                            textTransform: 'capitalize'
                          }}
                        >
                          Category: {ticket.category}
                        </span>
                      </div>

                      {/* Uploaded Documents section */}
                      {hasDoc && (
                        <div className="ticket-doc-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                              style={{
                                background: 'var(--accent-olive-subtle)',
                                color: 'var(--accent-olive)',
                                padding: '6px',
                                borderRadius: 'var(--radius-xs)',
                                flexShrink: 0
                              }}
                            >
                              <FileIcon size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {ticket.attachmentName || 'Uploaded Document'}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                Saved securely.
                              </div>
                            </div>
                          </div>

                          {/* "View Uploaded Docs" Button */}
                          <button
                            type="button"
                            className="btn-view-doc"
                            onClick={() =>
                              openDocPreview(
                                ticket.ticketNumber,
                                ticket.attachmentName || 'Uploaded Document',
                                ticket.attachmentUrl
                              )
                            }
                          >
                            <Eye size={13} />
                            <span>View Uploaded Docs</span>
                          </button>
                        </div>
                      )}

                      {/* Bottom Action Bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginTop: '14px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-light)',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Mark as Solved Button */}
                        <div>
                          {!isSolved ? (
                            <button
                              type="button"
                              className="btn-mark-solved"
                              disabled={isUpdating}
                              onClick={() => handleMarkAsSolved(ticket.ticketNumber)}
                              title="Mark this support ticket as solved"
                            >
                              <CheckCircle2 size={14} />
                              <span>{isUpdating ? 'Marking Solved...' : 'Mark as Solved'}</span>
                            </button>
                          ) : (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                fontWeight: 700
                              }}
                            >
                              <CheckCheck size={14} color="var(--accent-olive)" />
                              <span>Solved & Archived</span>
                            </div>
                          )}
                        </div>

                        {/* Dedicated Chat Option for Each Open Ticket */}
                        <div>
                          <button
                            type="button"
                            className="btn-ticket-chat"
                            onClick={() => handleOpenChat(ticket)}
                            title="Open dedicated chat for this ticket"
                          >
                            <MessageSquare size={14} />
                            <span>{isSolved ? 'View Chat History' : 'Open Ticket Chat'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RAISE A TICKET */}
        {activeTab === 'new-ticket' && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px 20px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 4px 0'
                }}
              >
                Submit a Support Ticket
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Our engineering & travel concierge team will investigate and reply via email & dedicated ticket chat.
              </p>
            </div>

            {ticketSubmitted ? (
              <div
                style={{
                  background: 'var(--accent-olive-subtle)',
                  border: '1px solid var(--accent-olive)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 20px',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--badge-match-bg)',
                    color: 'var(--badge-match-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 4px 12px rgba(229, 236, 104, 0.3)'
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--accent-olive-dark)',
                    margin: '0 0 6px 0'
                  }}
                >
                  Ticket {createdTicketNumber} Created!
                </h3>
                <p style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-olive)', margin: '0 0 8px 0' }}>
                  "We will looking into Issue"
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 18px 0', lineHeight: 1.45 }}>
                  A confirmation email has been dispatched to your email address. All documents uploaded..
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-ticket-chat"
                    onClick={() => {
                      const created = myTickets.find((t) => t.ticketNumber === createdTicketNumber);
                      if (created) {
                        handleOpenChat(created);
                      } else {
                        setActiveTab('tickets');
                      }
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>Open Dedicated Ticket Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTicketSubmitted(false);
                      setTicketSubject('');
                      setTicketMessage('');
                      setTicketAttachment(null);
                    }}
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-card)',
                      padding: '8px 18px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Raise Another Ticket
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Issue Category
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-surface-warm)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="split">Settlement Calculation Query</option>
                    <option value="upi">UPI Payment Confirmation / QR Issue</option>
                    <option value="invite">Invite Link & Traveler Access</option>
                    <option value="bug">Report Visual or UI Issue</option>
                    <option value="other">General Feedback / Request</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unbalanced split in Goa trip settlement"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-surface-warm)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Attachment Upload (Saved to AWS S3) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Attach Documents / Screenshots <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(PDF, JPG, PNG, max 10MB)</span>
                  </label>
                  <div
                    style={{
                      border: '1.5px dashed var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      background: 'var(--bg-surface-warm)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <input
                      type="file"
                      id="file-upload-input"
                      accept="image/*,application/pdf,text/plain"
                      onChange={(e) => setTicketAttachment(e.target.files?.[0] || null)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                    {ticketAttachment ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <FileIcon size={18} color="var(--accent-olive)" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ticketAttachment.name} ({Math.round(ticketAttachment.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setTicketAttachment(null);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-rose)',
                            cursor: 'pointer',
                            padding: '2px 4px'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Paperclip size={20} color="var(--accent-olive)" style={{ margin: '0 auto 4px' }} />
                        <p style={{ margin: '0 0 2px 0', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Click or drag file to attach
                        </p>
                        <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          PNG, JPG, PDF upto 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Detailed Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe your issue with group name, transaction reference, or steps to reproduce..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-surface-warm)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>

                {ticketError && (
                  <div
                    style={{
                      background: 'var(--accent-rose-light)',
                      border: '1px solid rgba(225, 29, 72, 0.25)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '8px 12px',
                      color: 'var(--accent-rose)',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <HelpCircle size={15} />
                    <span>{ticketError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-ticket-chat"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '11px 16px',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Creating Ticket...' : 'Submit Support Ticket'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: FAQS & KNOWLEDGE BASE */}
        {activeTab === 'faqs' && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 18px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ marginBottom: '14px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 4px 0'
                }}
              >
                Frequently Asked Questions
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Instant solutions for group trip ledger, debt simplification, and payments.
              </p>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search topics, debt algorithm, UPI, security..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-surface-warm)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
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
                  onClick={() => setActiveFaqCategory(c.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: activeFaqCategory === c.id ? '1px solid var(--accent-olive)' : '1px solid var(--border-card)',
                    background: activeFaqCategory === c.id ? 'var(--accent-olive)' : 'var(--bg-surface-warm)',
                    color: activeFaqCategory === c.id ? '#FFFFFF' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Accordion FAQ items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    style={{
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      background: isOpen ? 'var(--bg-surface-warm)' : 'var(--bg-surface)',
                      overflow: 'hidden',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        gap: '10px'
                      }}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} color="var(--accent-olive)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: '0 14px 14px',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)' }}>
                  <HelpCircle size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.78rem', margin: 0 }}>No articles matched your search query.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* DEDICATED TICKET CHAT MODAL / DRAWER                              */}
        {/* ================================================================= */}
        {activeChatTicket && (
          <div className="ticket-chat-backdrop" onClick={() => setActiveChatTicket(null)}>
            <div className="ticket-chat-window" onClick={(e) => e.stopPropagation()}>
              {/* Chat Header */}
              <div className="ticket-chat-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        background: 'var(--badge-match-bg)',
                        color: 'var(--badge-match-text)',
                        border: '1px solid var(--badge-match-border)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: 800,
                        letterSpacing: '0.04em'
                      }}
                    >
                      {activeChatTicket.ticketNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: activeChatTicket.status === 'RESOLVED' ? 'var(--bg-surface-subtle)' : 'var(--badge-match-bg)',
                        color: activeChatTicket.status === 'RESOLVED' ? 'var(--text-muted)' : 'var(--badge-match-text)',
                        border: '1px solid var(--badge-match-border)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {activeChatTicket.status === 'RESOLVED' ? 'SOLVED' : 'OPEN'}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      margin: 0,
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '320px'
                    }}
                  >
                    {activeChatTicket.subject}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeChatTicket.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsSolved(activeChatTicket.ticketNumber)}
                      style={{
                        background: 'var(--badge-match-bg)',
                        color: 'var(--badge-match-text)',
                        border: '1px solid var(--badge-match-border)',
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark Solved</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveChatTicket(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.18)',
                      border: 'none',
                      color: '#ffffff',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="ticket-chat-body">
                {isLoadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    Loading conversation...
                  </div>
                ) : chatMessages.length === 0 ? (
                  /* Fallback if no messages returned yet from backend */
                  <div className="chat-bubble-user">
                    <div style={{ fontSize: '0.68rem', opacity: 0.9, marginBottom: '2px', fontWeight: 700, color: '#E5EC68' }}>
                      You (Initial Inquiry)
                    </div>
                    <div>{activeChatTicket.message}</div>

                    {activeChatTicket.attachmentName && (
                      <div>
                        {/\.(jpe?g|png|webp|gif)$/i.test(activeChatTicket.attachmentName) ? (
                          <img
                            src={getTicketAttachmentUrl(activeChatTicket.ticketNumber, activeChatTicket.attachmentUrl)}
                            alt={activeChatTicket.attachmentName}
                            className="chat-attachment-thumb"
                            onClick={() =>
                              openDocPreview(
                                activeChatTicket.ticketNumber,
                                activeChatTicket.attachmentName || 'document',
                                activeChatTicket.attachmentUrl
                              )
                            }
                          />
                        ) : (
                          <div
                            className="chat-attachment-pill"
                            onClick={() =>
                              openDocPreview(
                                activeChatTicket.ticketNumber,
                                activeChatTicket.attachmentName || 'document',
                                activeChatTicket.attachmentUrl
                              )
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <FileIcon size={14} />
                            <span>{activeChatTicket.attachmentName}</span>
                            <Eye size={12} />
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: '0.62rem', opacity: 0.75, textAlign: 'right', marginTop: '4px' }}>
                      {new Date(activeChatTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ) : (
                  chatMessages
                    .filter((m) => m.id && !m.id.startsWith('seed-'))
                    .map((msg, index) => {
                      if (msg.senderRole === 'SYSTEM') {
                        return (
                          <div key={msg.id || index} className="chat-bubble-system">
                            {msg.message}
                          </div>
                        );
                      }

                      const isUser = msg.senderRole === 'USER';
                      const isInitialInquiry = isUser && index === 0;

                      return (
                        <div key={msg.id || index} className={isUser ? 'chat-bubble-user' : 'chat-bubble-support'}>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: isUser ? '#E5EC68' : 'var(--accent-olive)',
                              marginBottom: '2px'
                            }}
                          >
                            {isInitialInquiry ? 'You (Initial Inquiry)' : isUser ? 'You' : msg.senderName || 'Concierge Support'}
                          </div>

                          {msg.message && <div>{msg.message}</div>}


                          {/* Attachment in message */}
                          {msg.attachmentUrl && (
                            <div>
                              {/\.(jpe?g|png|webp|gif)$/i.test(msg.attachmentName || '') ||
                                msg.attachmentType?.includes('image') ? (
                                <img
                                  src={msg.attachmentUrl}
                                  alt={msg.attachmentName || 'Attached image'}
                                  className="chat-attachment-thumb"
                                  onClick={() =>
                                    openDocPreview(
                                      activeChatTicket.ticketNumber,
                                      msg.attachmentName || 'Attachment',
                                      msg.attachmentUrl
                                    )
                                  }
                                />
                              ) : (
                                <div
                                  className={isUser ? 'chat-attachment-pill' : ''}
                                  style={
                                    !isUser
                                      ? {
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'var(--bg-surface-warm)',
                                        border: '1px solid var(--border-card)',
                                        padding: '5px 10px',
                                        borderRadius: 'var(--radius-xs)',
                                        fontSize: '0.72rem',
                                        marginTop: '6px',
                                        color: 'var(--accent-olive)',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                      }
                                      : { cursor: 'pointer' }
                                  }
                                  onClick={() =>
                                    openDocPreview(
                                      activeChatTicket.ticketNumber,
                                      msg.attachmentName || 'Attachment',
                                      msg.attachmentUrl
                                    )
                                  }
                                >
                                  <FileIcon size={14} />
                                  <span>{msg.attachmentName || 'Attached Document'}</span>
                                  <Eye size={12} />
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: '0.62rem',
                              opacity: 0.75,
                              textAlign: isUser ? 'right' : 'left',
                              marginTop: '4px'
                            }}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="chat-input-bar">
                {chatAttachment && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--accent-olive-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--accent-olive)',
                      width: 'fit-content',
                      fontSize: '0.72rem',
                      color: 'var(--accent-olive)'
                    }}
                  >
                    <Paperclip size={13} />
                    <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                      {chatAttachment.name} ({Math.round(chatAttachment.size / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatAttachment(null)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={13} color="var(--accent-olive)" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Attach file button */}
                  <label
                    htmlFor="chat-file-input"
                    title="Upload document or image"
                    style={{
                      cursor: 'pointer',
                      color: 'var(--accent-olive)',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-surface-warm)',
                      border: '1px solid var(--border-card)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <Paperclip size={16} />
                  </label>
                  <input
                    id="chat-file-input"
                    type="file"
                    accept="image/*,application/pdf,text/plain"
                    style={{ display: 'none' }}
                    onChange={(e) => setChatAttachment(e.target.files?.[0] || null)}
                  />

                  <input
                    type="text"
                    placeholder="Type message or attach more docs..."
                    value={chatDraftText}
                    onChange={(e) => setChatDraftText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-card)',
                      outline: 'none',
                      background: 'var(--bg-surface-warm)',
                      color: 'var(--text-primary)'
                    }}
                  />

                  <button
                    type="submit"
                    className="btn-ticket-chat"
                    disabled={isSendingMessage || (!chatDraftText.trim() && !chatAttachment)}
                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
                  >
                    <Send size={14} />
                    <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* DOCUMENT PREVIEW LIGHTBOX MODAL                                   */}
        {/* ================================================================= */}
        {previewDoc && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(24, 25, 22, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setPreviewDoc(null)}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-card)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'var(--bg-surface-warm)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-olive)', fontWeight: 700 }}>
                    {previewDoc.ticketNumber}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {previewDoc.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'var(--accent-olive)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 8px rgba(70, 75, 41, 0.2)'
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Open Full / Download</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-surface-warm)',
                  minHeight: '260px'
                }}
              >
                {previewDoc.isImage ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '65vh',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '32px 24px',
                      textAlign: 'center',
                      maxWidth: '360px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <FileIcon size={44} color="var(--accent-olive)" style={{ margin: '0 auto 12px' }} />
                    <h4
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        margin: '0 0 6px 0',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {previewDoc.name}
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                      Document file stored securely.
                    </p>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ticket-chat"
                      style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 18px' }}
                    >
                      <Download size={14} />
                      <span>Open Document in Browser</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
