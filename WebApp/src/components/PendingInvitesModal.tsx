import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import { PendingInvitation } from '../types/group';
import { groupService } from '../services/group.service';

interface PendingInvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: PendingInvitation[];
  onInviteHandled: () => void;
}

export const PendingInvitesModal: React.FC<PendingInvitesModalProps> = ({
  isOpen,
  onClose,
  invitations,
  onInviteHandled,
}) => {
  const [processingCode, setProcessingCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleAccept = async (inviteCode: string, groupName: string) => {
    setProcessingCode(inviteCode);
    setActionMessage(null);
    try {
      const res = await groupService.acceptInvite(inviteCode);
      setActionMessage({
        id: inviteCode,
        text: res.message || `Joined "${groupName}" successfully!`,
        type: 'success'
      });
      onInviteHandled();
    } catch (err: any) {
      console.error('Accept invite error:', err);
      setActionMessage({
        id: inviteCode,
        text: err.message || 'Failed to accept invitation.',
        type: 'error'
      });
    } finally {
      setProcessingCode(null);
    }
  };

  const handleReject = async (inviteCode: string, groupName: string) => {
    if (!window.confirm(`Decline invitation to join "${groupName}"?`)) return;

    setProcessingCode(inviteCode);
    setActionMessage(null);
    try {
      const res = await groupService.rejectInvite(inviteCode);
      setActionMessage({
        id: inviteCode,
        text: res.message || `Declined invitation for "${groupName}".`,
        type: 'success'
      });
      onInviteHandled();
    } catch (err: any) {
      console.error('Reject invite error:', err);
      setActionMessage({
        id: inviteCode,
        text: err.message || 'Failed to decline invitation.',
        type: 'error'
      });
    } finally {
      setProcessingCode(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog pending-invites-dialog" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '620px', width: '94%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-icon-badge" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 className="modal-title">Pending Trip Invitations</h3>
              <p className="modal-subtitle">
                {invitations.length === 0 
                  ? 'No pending invitations at this time'
                  : `You have ${invitations.length} invitation${invitations.length === 1 ? '' : 's'} waiting for your approval`}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '460px', overflowY: 'auto', padding: '16px 24px' }}>
          {actionMessage && (
            <div 
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: actionMessage.type === 'success' ? '#ecfdf5' : '#fff1f2',
                color: actionMessage.type === 'success' ? '#047857' : '#e11d48',
                border: actionMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecdd3'
              }}
            >
              {actionMessage.text}
            </div>
          )}

          {invitations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--slate-500)' }}>
              <Sparkles size={36} className="text-emerald" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--slate-800)', fontSize: '1rem' }}>All caught up!</h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>When a friend invites you to a group, it will appear here for your approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invitations.map((inv) => {
                const isWorking = processingCode === inv.inviteCode;
                const startFormatted = formatDate(inv.startDate);
                const endFormatted = formatDate(inv.endDate);

                return (
                  <div key={inv.id} className="pending-invite-row-card">
                    <div className="pending-invite-card-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="traveler-role-tag invite-tag" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                          <Mail size={11} />
                          <span>Approval Required</span>
                        </span>
                        <span className="trip-type-pill" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {inv.tripType || 'Trip'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontFamily: 'monospace' }}>
                        {inv.inviteCode}
                      </span>
                    </div>

                    <h4 className="pending-invite-group-name">{inv.groupName}</h4>

                    <div className="pending-invite-meta-row">
                      <span>📍 <strong>{inv.destination}</strong></span>
                      {startFormatted && endFormatted && (
                        <>
                          <span>•</span>
                          <span>📅 {startFormatted} – {endFormatted}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Invited by <strong>{inv.organizerName}</strong></span>
                    </div>

                    <div className="pending-invite-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReject(inv.inviteCode, inv.groupName)}
                        disabled={isWorking}
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAccept(inv.inviteCode, inv.groupName)}
                        disabled={isWorking}
                        style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                      >
                        {isWorking ? (
                          <>
                            <Loader2 size={14} className="spin-animation" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Approve & Join</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
