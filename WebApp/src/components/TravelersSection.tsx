import React, { useState } from 'react';
import { Users, UserPlus, Trash2, CheckCircle2, Mail, Crown, Send, Check } from 'lucide-react';
import { Traveler } from '../types/group';
import { AddTravelerModal } from './AddTravelerModal';

interface TravelersSectionProps {
  travelers: Traveler[];
  onAddTraveler: (traveler: Omit<Traveler, 'id'>) => void;
  onRemoveTraveler: (id: string | number) => void;
  error?: string;
}

export const TravelersSection: React.FC<TravelersSectionProps> = ({
  travelers,
  onAddTraveler,
  onRemoveTraveler,
  error
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const handleCopyInviteLink = (traveler: Traveler) => {
    const LIVE_APP_DOMAIN = 'https://hack-celestial-one.vercel.app';
    const liveOrigin = typeof window !== 'undefined' && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
      ? window.location.origin
      : LIVE_APP_DOMAIN;
    const rawInviteUrl = traveler.inviteUrl || `${liveOrigin}/join/${traveler.inviteCode || 'TRIP-PENDING'}`;
    const inviteUrl = rawInviteUrl
      .replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, LIVE_APP_DOMAIN)
      .replace(/^capacitor:\/\/localhost/i, LIVE_APP_DOMAIN);

    navigator.clipboard.writeText(inviteUrl);
    setCopiedId(traveler.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="form-section-card">
      <div className="section-header">
        <div className="travelers-header-row">
          <div>
            <h3 className="section-title">
              <Users size={20} className="section-title-icon" />
              Who's Going?
              <span className="traveler-count-badge">
                {travelers.length} {travelers.length === 1 ? 'Traveler' : 'Travelers'}
              </span>
            </h3>
            <p className="section-subtitle">
              Add registered friends or invite new members. Official links are sent and members join upon approval.
            </p>
          </div>

          <button
            type="button"
            className="btn-add-traveler"
            onClick={() => setIsModalOpen(true)}
          >
            <UserPlus size={15} />
            <span>Add Traveler</span>
          </button>
        </div>
      </div>

      {/* Tier Indicator Banner */}
      {travelers.length <= 6 ? (
        <div className="traveler-tier-banner free-tier">
          <div className="tier-banner-left">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <div className="tier-banner-text-wrap">
              <span className="tier-banner-main">
                <strong>Free Tier Active:</strong> {travelers.length} of 6 slots used (₹0 fee)
              </span>
              <div className="tier-slots-track" aria-label={`${travelers.length} of 6 slots filled`}>
                {[1, 2, 3, 4, 5, 6].map((slotNum) => (
                  <span
                    key={slotNum}
                    className={`tier-slot-dot ${slotNum <= travelers.length ? 'filled' : ''}`}
                    title={`Slot ${slotNum}: ${slotNum <= travelers.length ? 'Filled' : 'Free slot'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <span className="tier-pill-free">Up to 6 Free</span>
        </div>
      ) : (
        <div className="traveler-tier-banner premium-tier">
          <div className="tier-banner-left">
            <Crown size={16} className="text-amber-600" />
            <div>
              <div className="tier-banner-headline">
                <strong>Large Squad Tier:</strong> {travelers.length} Travelers
              </div>
              <div className="tier-banner-subtext">
                Only up to 6 members are free. Adding 7+ members requires a ₹19 one-time activation fee during review.
              </div>
            </div>
          </div>
          <span className="tier-pill-paid">₹19 Upgrade Fee</span>
        </div>
      )}

      {error && <div className="field-error-msg" style={{ marginBottom: '12px' }}>{error}</div>}

      <div className="travelers-list-flat">
        {travelers.map((traveler, index) => {
          const isOrganizer = traveler.role === 'Organizer';
          const isAccepted = traveler.status === 'ACCEPTED';
          const isPending = !isOrganizer && (!traveler.status || traveler.status === 'PENDING');
          const isPaidSlot = index >= 6;

          return (
            <div key={traveler.id} className={`traveler-flat-row ${isPaidSlot ? 'paid-slot-row' : ''}`}>
              <div className="traveler-row-left">
                <div
                  className="traveler-avatar-circle"
                  style={{ backgroundColor: traveler.avatarBg || '#059669' }}
                >
                  {getInitials(traveler.name)}
                </div>
                <div className="traveler-details">
                  <div className="traveler-name-row">
                    <span className="traveler-name">{traveler.name}</span>
                    {isOrganizer ? (
                      <span className="traveler-role-tag organizer-tag">
                        <Crown size={12} />
                        <span>Organizer</span>
                      </span>
                    ) : isAccepted ? (
                      <span className="traveler-role-tag registered-tag" title="Confirmed group member">
                        <CheckCircle2 size={12} />
                        <span>Joined</span>
                      </span>
                    ) : (
                      <span className="traveler-role-tag invite-tag" title="Official invitation sent. Participant will be added upon approval.">
                        <Mail size={12} />
                        <span>Pending</span>
                      </span>
                    )}
                    {isPaidSlot && (
                      <span className="traveler-role-tag paid-slot-tag" title="7th+ member slot covered by ₹19 upgrade">
                        7th+ Member (+₹19)
                      </span>
                    )}
                  </div>
                  <span className="traveler-email">{traveler.email}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isPending && (
                  <button
                    type="button"
                    className={`btn-send-invite ${copiedId === traveler.id ? 'copied' : ''}`}
                    onClick={() => handleCopyInviteLink(traveler)}
                    title={copiedId === traveler.id ? 'Invite link copied!' : `Send invite link for ${traveler.name}`}
                    aria-label={`Send invite link for ${traveler.name}`}
                  >
                    {copiedId === traveler.id ? (
                      <Check size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                )}

                {!isOrganizer && (
                  <button
                    type="button"
                    className="btn-remove-traveler"
                    onClick={() => onRemoveTraveler(traveler.id)}
                    title={`Remove ${traveler.name}`}
                    aria-label={`Remove ${traveler.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddTravelerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAddTraveler}
        existingEmails={travelers.map((t) => t.email)}
      />
    </div>
  );
};
