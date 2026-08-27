import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  FileQuestion,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Check,
  Send,
  Sparkles
} from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQS = [
  {
    q: 'How does the Minimum Cash Flow Settlement Algorithm work?',
    a: 'Instead of everyone paying multiple separate transactions for hotels, meals, and activities, our algorithm computes the net balance of every traveler and solves a greedy matching problem to minimize total bank/UPI transfers by up to 80%.'
  },
  {
    q: 'Can I split expenses in multiple currencies like USD and INR?',
    a: 'Yes! GroupTrip Ledger automatically converts exchange rates for overseas trips and keeps an itemized audit trail in your home currency.'
  },
  {
    q: 'How do I invite friends who don’t have an account yet?',
    a: 'Simply copy the 6-digit trip invite code or WhatsApp link from the group card. Your friends can join with 1 click without any lengthy sign-up.'
  },
  {
    q: 'What happens if a group member disputes an expense?',
    a: 'Organizers can edit or adjust custom proportions in the Group Ledger at any time before final settlement.'
  }
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [isTicketSent, setIsTicketSent] = useState(false);

  const handleToggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMsg.trim()) return;
    setIsTicketSent(true);
    setTimeout(() => {
      setIsTicketSent(false);
      setTicketSubject('');
      setTicketMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card help-modal-card">
        {/* Top Header */}
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">24/7 Dedicated Support</span>
            <h3 className="modal-main-title">Help & Support Center</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-inner-scroll-body">
          {/* Quick Channels Grid */}
          <div className="support-channels-grid">
            <a
              href="https://wa.me/919876543210?text=Hi%20GroupTrip%20Support,%20I%20need%20help%20with%20my%20trip%20settlement."
              target="_blank"
              rel="noopener noreferrer"
              className="support-channel-card channel-whatsapp"
            >
              <MessageSquare size={20} className="text-emerald" />
              <div>
                <div className="channel-title">WhatsApp Live Desk</div>
                <div className="channel-sub">Instant response &lt; 5 mins</div>
              </div>
            </a>

            <div className="support-channel-card channel-dispute">
              <ShieldAlert size={20} className="text-amber" />
              <div>
                <div className="channel-title">Dispute Resolution</div>
                <div className="channel-sub">Audit trail verification</div>
              </div>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <h4 className="support-section-subhead">
            <FileQuestion size={16} className="text-emerald" />
            <span>Frequently Asked Questions</span>
          </h4>

          <div className="faq-accordion-list">
            {FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div key={idx} className="faq-item-box">
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => handleToggleFaq(idx)}
                  >
                    <span className="faq-q-text">{faq.q}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isExpanded && <div className="faq-answer-body">{faq.a}</div>}
                </div>
              );
            })}
          </div>

          {/* Raise Support Ticket Form */}
          <h4 className="support-section-subhead mt-20">
            <Sparkles size={16} className="text-emerald" />
            <span>Raise Priority Concierge Ticket</span>
          </h4>

          {isTicketSent ? (
            <div className="ticket-success-alert">
              <Check size={20} className="text-emerald" />
              <div>
                <strong>Support Ticket #HC-8821 Created!</strong>
                <p className="text-xs">Our concierge support team will reach out via email shortly.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendTicket} className="support-ticket-form">
              <div className="form-group-block">
                <label className="form-group-label">Issue Subject</label>
                <input
                  type="text"
                  className="styled-text-input"
                  placeholder="e.g. Payment settlement confirmation delay"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Description & Trip Details</label>
                <textarea
                  className="styled-text-input h-80"
                  placeholder="Describe your issue with group name or transaction reference..."
                  value={ticketMsg}
                  onChange={(e) => setTicketMsg(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-confirm-settlement w-full">
                <Send size={15} />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
