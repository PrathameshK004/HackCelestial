import React, { useState } from 'react';
import { X, Users, ShieldCheck, Mail, Smartphone, Copy, Check } from 'lucide-react';
import { SettlementData } from '../../types/group';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  destination: string;
  members: SettlementData['members'];
  currency: string;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  groupName,
  destination,
  members,
}) => {
  const [copiedUpiId, setCopiedUpiId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpiId(upiId);
    setTimeout(() => setCopiedUpiId(null), 2000);
  };

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
              Group Members
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

        {/* Members List (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map((member, index) => {
            const initial = (member.name || 'T')[0].toUpperCase();
            const avatarBg = getAvatarBg(member.name, index);
            const isOrganizer = index === 0 || member.role === 'Organizer';

            return (
              <div
                key={String(member.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-surface-warm)',
                  border: '1px solid var(--border-light)',
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
                      backgroundColor: avatarBg,
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
                          <span>Lead</span>
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

                {/* Right: UPI VPA or Verified Tag */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {member.upiId ? (
                    <button
                      type="button"
                      onClick={() => handleCopyUpi(member.upiId!)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: copiedUpiId === member.upiId ? '#ecfdf5' : 'var(--bg-surface)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.68rem',
                        color: copiedUpiId === member.upiId ? '#059669' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                      title="Copy UPI ID"
                    >
                      <Smartphone size={11} />
                      <span>{copiedUpiId === member.upiId ? 'Copied!' : member.upiId}</span>
                      {copiedUpiId === member.upiId ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Active
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
