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
  Compass,
  ArrowRight
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

  const LIVE_APP_DOMAIN = 'https://hack-celestial-one.vercel.app';
  const liveOrigin = typeof window !== 'undefined' && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? window.location.origin
    : LIVE_APP_DOMAIN;

  const rawInviteUrl = createdGroup?.inviteUrl || `${liveOrigin}/join/${createdGroup?.inviteCode || 'TRIP-DEMO'}`;
  const inviteUrl = rawInviteUrl
    .replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, LIVE_APP_DOMAIN)
    .replace(/^capacitor:\/\/localhost/i, LIVE_APP_DOMAIN);

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our trip "${tripData.groupName}" to ${tripData.destination} on Triptual: ${inviteUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join our trip to ${tripData.destination}!`)}`,
    sms: `sms:?body=${encodeURIComponent(`Join our trip "${tripData.groupName}" to ${tripData.destination}: ${inviteUrl}`)}`,
    copyLink: inviteUrl
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="success-drawer-overlay" onClick={onClose}>
      <div
        className="success-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Handle & Close Bar */}
        <div className="success-drawer-handle-bar">
          <div className="success-drawer-handle" />
          <button
            type="button"
            className="success-drawer-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="success-drawer-content">
          {/* Refined Check Icon Badge */}
          <div className="success-drawer-icon-badge">
            <Check size={24} strokeWidth={3} />
          </div>

          {/* Heading */}
          <h2 className="success-drawer-title">
            Trip Workspace Created!
          </h2>
          <p className="success-drawer-subtitle">
            Your trip workspace is ready. Invite your travelers to begin planning.
          </p>

          {/* Trip Summary Card */}
          <div className="success-drawer-trip-card">
            <div className="success-drawer-trip-header">
              <div className="success-drawer-trip-name-wrap">
                <Compass size={17} className="success-drawer-compass" />
                <span className="success-drawer-trip-name">
                  {tripData.groupName || createdGroup?.name || 'Untitled Trip'}
                </span>
              </div>
              <span className="success-drawer-type-pill">
                {tripData.tripType || createdGroup?.tripType || 'Trip'}
              </span>
            </div>

            <div className="success-drawer-trip-details">
              <span>📍 {tripData.destination || createdGroup?.destination}</span>
              <span className="success-drawer-dot">•</span>
              <span>{startDateFormatted && endDateFormatted ? `${startDateFormatted} - ${endDateFormatted}` : `${durationDays} Days`}</span>
              <span className="success-drawer-dot">•</span>
              <span>{tripData.currency} ({tripData.expenseSplit} split)</span>
            </div>

            {(createdGroup?.paymentStatus === 'PAID' || tripData.payment?.status === 'PAID') && (
              <div className="success-drawer-payment-badge">
                <Check size={12} strokeWidth={3} />
                <span>Squad Upgrade Activated</span>
                {(createdGroup?.paymentTransactionId || tripData.payment?.transactionId) && (
                  <span className="success-drawer-txn">
                    • Txn: {createdGroup?.paymentTransactionId || tripData.payment?.transactionId}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Share Section */}
          <div className="success-drawer-share-section">
            <div className="success-drawer-share-header">
              <div className="success-drawer-share-title">
                <Share2 size={15} />
                <span>Invite Travelers</span>
              </div>
              <span className="success-drawer-code-pill">
                Code: <strong>{createdGroup?.inviteCode || 'TRIP-READY'}</strong>
              </span>
            </div>

            {/* Copyable Link Field */}
            <div className="success-drawer-copy-bar">
              <input 
                type="text" 
                readOnly 
                value={inviteUrl} 
                className="success-drawer-copy-input"
              />
              <button 
                type="button" 
                className={`success-drawer-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <CheckCheck size={15} strokeWidth={2.4} /> : <Copy size={15} strokeWidth={2.2} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Unified 4-App Share Grid */}
            <div className="success-drawer-apps-grid">
              <a 
                href={shareLinks.whatsapp} 
                target="_blank" 
                rel="noopener noreferrer"
                className="success-drawer-app-item app-whatsapp"
              >
                <div className="app-icon-wrap whatsapp-icon">
                  <MessageCircle size={16} />
                </div>
                <span>WhatsApp</span>
              </a>

              <a 
                href={shareLinks.telegram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="success-drawer-app-item app-telegram"
              >
                <div className="app-icon-wrap telegram-icon">
                  <Send size={15} />
                </div>
                <span>Telegram</span>
              </a>

              <a 
                href={shareLinks.sms} 
                className="success-drawer-app-item app-sms"
              >
                <div className="app-icon-wrap sms-icon">
                  <MessageCircle size={16} />
                </div>
                <span>SMS</span>
              </a>

              <a 
                href={`mailto:?subject=${encodeURIComponent(`Join "${tripData.groupName}" on Triptual`)}&body=${encodeURIComponent(`Hey!\n\nJoin our trip to ${tripData.destination}: ${inviteUrl}`)}`} 
                className="success-drawer-app-item app-email"
              >
                <div className="app-icon-wrap email-icon">
                  <Mail size={16} />
                </div>
                <span>Email</span>
              </a>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            className="success-drawer-dashboard-btn"
            onClick={onClose}
          >
            <span>Go to Trip Dashboard</span>
            <ArrowRight size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};

