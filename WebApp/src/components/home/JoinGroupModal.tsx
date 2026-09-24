import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { groupService } from '../../services/group.service';
import { useAuth } from '../../context/AuthContext';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (groupName: string) => void;
}

const extractInviteCode = (value: string): string | null => {
  const input = value.trim();
  if (!input) return null;

  try {
    const url = new URL(input);
    const pathMatch = url.pathname.match(/\/join\/([^/?#]+)/i);
    const queryCode = url.searchParams.get('invite') || url.searchParams.get('join');
    const code = pathMatch?.[1] || queryCode;
    return code ? decodeURIComponent(code).trim().toUpperCase() : null;
  } catch {
    const pathMatch = input.match(/(?:^|\/)join\/([^/?#]+)/i);
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim().toUpperCase();
    return input.replace(/^#?(?:invite|join)=/i, '').trim().toUpperCase();
  }
};

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  onJoinSuccess
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractInviteCode(inviteCode);
    if (!code) {
      setError('Enter a trip code or a valid invitation URL.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const inviteResponse = await groupService.getInviteDetails(code);
      const invitedEmail = inviteResponse.data?.invitedEmail?.trim().toLowerCase();
      const signedInEmail = user?.emailId?.trim().toLowerCase();

      if (!invitedEmail || !signedInEmail || invitedEmail !== signedInEmail) {
        throw new Error('This invitation is assigned to a different email address. Ask the organizer to invite your account.');
      }

      const res = await groupService.acceptInvite(code);
      const groupName = res?.data?.groupName || 'Trip Group';
      onJoinSuccess(groupName);
      onClose();
    } catch (err: any) {
      console.warn('Accept invite failed:', err);
      setError(err.message || 'Invalid or expired trip code. Please verify it with the organizer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card join-code-modal-card">
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald"><KeyRound size={12} /> Private invitation</span>
            <h3 className="modal-main-title">Join with Code</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settle-form-content">
          <div className="join-code-intro">
            <div className="join-code-icon"><KeyRound size={20} /></div>
            <div>
              <strong>Your invitation is personal</strong>
              <p>Use the code sent to your signed-in email. It cannot be used by another account.</p>
            </div>
          </div>

          <p className="modal-subtitle-text">Enter the trip code or paste the complete invitation URL.</p>

          <div className="form-group-block">
            <label className="form-group-label" htmlFor="join-trip-code">Trip code or invitation URL</label>
            <div className="input-with-icon">
              <KeyRound size={17} className="input-inner-icon text-emerald" />
              <input
                id="join-trip-code"
                type="text"
                className="styled-text-input pl-icon text-uppercase letter-spaced"
                placeholder="TRIP-AB12CD34 or https://.../join/TRIP-AB12CD34"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError('');
                }}
                maxLength={300}
                required
              />
            </div>
            {error && (
              <div className="error-hint-row join-code-error" role="alert">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>


          <div className="modal-bottom-actions">
            <button type="button" className="btn-cancel-flat" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm-settlement" disabled={isLoading}>
              {isLoading ? (
                <span>Validating...</span>
              ) : (
                <span className="flex-center-gap">
                  Join Group <ArrowRight size={16} />
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
