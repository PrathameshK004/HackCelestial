import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Share2, 
  Send, 
  MessageCircle, 
  Mail, 
  Compass
} from 'lucide-react';

import { CreatedGroupData, TripFormData } from '../types/group';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: TripFormData;
  createdGroup?: CreatedGroupData | null;
  durationDays: number;
  startDateFormatted: string;
  endDateFormatted: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  tripData,
  createdGroup,
  durationDays,
  startDateFormatted,
  endDateFormatted
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = createdGroup?.inviteUrl || `http://localhost:3000/join/${createdGroup?.inviteCode || 'TRIP-DEMO'}`;
  const shareLinks = createdGroup?.shareLinks || {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${tripData.groupName}" to ${tripData.destination} on Triptual: ${inviteUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our trip to ${tripData.destination}!`)}`,
    sms: `sms:?body=${encodeURIComponent(`Join our trip "${tripData.groupName}" to ${tripData.destination}: ${inviteUrl}`)}`,
    copyLink: inviteUrl
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="success-theme-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '580px', width: '92%' }}
      >
        {/* Top Right Close 'X' Button */}
        <button
          type="button"
          className="success-theme-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={22} strokeWidth={2.2} />
        </button>

        {/* Circular Checkmark Badge */}
        <div className="success-icon-outer-ring">
          <div className="success-icon-inner-circle">
            <Check size={38} strokeWidth={3.5} color="#ffffff" />
          </div>
        </div>

        {/* Success Message Heading */}
        <h2 className="success-theme-title">
          Trip Workspace Created<br />Successfully!
        </h2>

        {/* Trip Context Card */}
        <div className="created-trip-summary-box">
          <div className="trip-summary-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} className="text-emerald-600" />
              <strong style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>
                {tripData.groupName || createdGroup?.name}
              </strong>
            </div>
            <span className="trip-type-pill">{tripData.tripType || createdGroup?.tripType}</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', margin: '6px 0 0 0' }}>
            📍 <strong>{tripData.destination || createdGroup?.destination}</strong> •{' '}
            {startDateFormatted && endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : `${durationDays} Days`} •{' '}
            {tripData.currency} ({tripData.expenseSplit} split)
          </p>
        </div>

        {/* Shareable Invite Section */}
        <div className="invite-sharing-section">
          <div className="invite-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Share2 size={16} className="text-emerald-600" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                Invite Travelers via Multi-App Links
              </h4>
            </div>
            <span className="invite-code-pill">Code: {createdGroup?.inviteCode || 'TRIP-READY'}</span>
          </div>

          {/* Copyable Link Input */}
          <div className="copy-link-input-wrap">
            <input 
              type="text" 
              readOnly 
              value={inviteUrl} 
              className="copy-link-input"
            />
            <button 
              type="button" 
              className={`btn-copy-link ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* 1-Click Multi-App Sharing Buttons */}
          <div className="multi-app-share-grid">
            <a 
              href={shareLinks.whatsapp} 
              target="_blank" 
              rel="noopener noreferrer"
              className="share-app-btn share-whatsapp"
            >
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </a>

            <a 
              href={shareLinks.telegram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="share-app-btn share-telegram"
            >
              <Send size={18} />
              <span>Telegram</span>
            </a>

            <a 
              href={shareLinks.sms} 
              className="share-app-btn share-sms"
            >
              <MessageCircle size={18} />
              <span>SMS</span>
            </a>

            <a 
              href={`mailto:?subject=${encodeURIComponent(`Join "${tripData.groupName}" on Triptual`)}&body=${encodeURIComponent(`Hey!\n\nJoin our trip to ${tripData.destination}: ${inviteUrl}`)}`} 
              className="share-app-btn share-email"
            >
              <Mail size={18} />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="success-theme-done-btn"
          onClick={onClose}
        >
          Go to Trip Dashboard
        </button>
      </div>
    </div>
  );
};
