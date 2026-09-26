import React from 'react';
import { X, Users, ShieldCheck, Mail } from 'lucide-react';
import { Traveler } from '../../types/group';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  destination: string;
  members: Traveler[];
  currency: string;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupName,
  destination,
  members,
}) => {
  if (!isOpen) return null;

  const getAvatarBg = (_name: string, index: number) => {
    const colors = ['#059669', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#0D9488'];
    return colors[index % colors.length];
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card" style={{ maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Top Header */}
        <div className="modal-top-bar" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <div className="modal-heading-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-pill-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', padding: '2px 8px' }}>
                <Users size={12} />
                <span>{members.length} {members.length === 1 ? 'Traveler' : 'Travelers'}</span>
              </span>
            </div>
            <h3 className="modal-main-title" style={{ fontSize: '1.15rem', marginTop: '4px' }}>
              Group Members & Roster
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              {groupName} · {destination}
            </p>
          </div>
          <button
            type="button"
            className="btn-close-circle"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Unstop Policy Banner */}
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid var(--border-light)', fontSize: '0.72rem', color: '#475569', lineHeight: 1.4 }}>
          <strong>Unstop Policy:</strong> Expense logging and cost sharing are locked until all group members accept their invitations.
        </div>

        {/* Members List (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map((member, index) => {
            const initial = (member.name || 'T')[0].toUpperCase();
            const avatarBg = getAvatarBg(member.name, index);
            const isOrganizer = String(member.role).toLowerCase() === 'organizer';
            const memberStatus = String(member.status || '').toUpperCase();
            const isConfirmed = isOrganizer || memberStatus === 'ACCEPTED';
            const isDeclined = !isOrganizer && (memberStatus === 'REJECTED' || memberStatus === 'DECLINED');

            return (
              <div
                key={String(member.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  background: isDeclined ? '#fff1f2' : 'var(--bg-surface-warm)',
                  border: isDeclined ? '1px solid #fecdd3' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                {/* Left: Avatar & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isDeclined ? '#e11d48' : avatarBg,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}
                  >
                    {initial}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {member.name}
                      </span>
                      {isOrganizer && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            background: 'rgba(5, 150, 105, 0.12)',
                            color: '#059669',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <ShieldCheck size={10} />
                          <span>Organizer</span>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {member.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Mail size={11} />
                          <span>{member.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {isConfirmed ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', padding: '3px 8px', background: '#ecfdf5', borderRadius: '999px', border: '1px solid #a7f3d0' }}>
                      {isOrganizer ? 'Organizer' : 'Accepted'}
                    </span>
                  ) : isDeclined ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e11d48', padding: '3px 8px', background: '#ffe4e6', borderRadius: '999px', border: '1px solid #fecdd3' }}>
                      Declined
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', padding: '3px 8px', background: '#fffbeb', borderRadius: '999px', border: '1px solid #fde68a' }}>
                      Pending Invite
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Actions */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-cancel-flat"
            onClick={onClose}
            style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '0.78rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
