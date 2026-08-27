import React, { useState } from 'react';
import { Users, UserPlus, Trash2, CheckCircle2, Mail, Crown } from 'lucide-react';
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
            <p className="section-subtitle">Add registered friends or invite new members to join this trip ledger.</p>
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

      {error && <div className="field-error-msg" style={{ marginBottom: '12px' }}>{error}</div>}

      <div className="travelers-list-flat">
        {travelers.map((traveler) => {
          const isOrganizer = traveler.role === 'Organizer';
          const isRegistered = traveler.isRegistered !== false;

          return (
            <div key={traveler.id} className="traveler-flat-row">
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
                    ) : isRegistered ? (
                      <span className="traveler-role-tag registered-tag" title="Registered platform member">
                        <CheckCircle2 size={12} />
                        <span>Platform User</span>
                      </span>
                    ) : (
                      <span className="traveler-role-tag invite-tag" title="Invitation link will be created">
                        <Mail size={12} />
                        <span>Invite Pending</span>
                      </span>
                    )}
                  </div>
                  <span className="traveler-email">{traveler.email}</span>
                </div>
              </div>

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
