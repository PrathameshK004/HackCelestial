import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (groupName: string) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  onJoinSuccess
}) => {
  if (!isOpen) return null;

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter an invite code or paste a trip link.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      setIsLoading(false);
      if (code === 'GOA784' || code === 'MNL492' || code === 'BALI99' || code.length >= 4) {
        onJoinSuccess(code === 'GOA784' ? 'Goa Friends Getaway' : 'Exclusive Group Trip');
        onClose();
      } else {
        setError('Invalid or expired invite code. Please verify with the group organizer.');
      }
    }, 800);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="settle-modal-card">
        <div className="modal-top-bar">
          <div className="modal-heading-group">
            <span className="badge-pill-emerald">Trip Invitation</span>
            <h3 className="modal-main-title">Join a Group Trip</h3>
          </div>
          <button type="button" className="btn-close-circle" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settle-form-content">
          <p className="modal-subtitle-text">
            Enter the 6-character trip invite code or paste the shared invitation link provided by your group organizer.
          </p>

          <div className="form-group-block">
            <label className="form-group-label">Invite Code or URL</label>
            <div className="input-with-icon">
              <KeyRound size={17} className="input-inner-icon text-emerald" />
              <input
                type="text"
                className="styled-text-input pl-icon text-uppercase letter-spaced"
                placeholder="e.g. GOA784 or https://..."
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError('');
                }}
                maxLength={40}
                required
              />
            </div>
            {error && (
              <div className="error-hint-row">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="suggested-codes-row">
            <span className="text-muted-sm">Try demo code:</span>
            <button
              type="button"
              className="badge-code-chip"
              onClick={() => setInviteCode('GOA784')}
            >
              GOA784 (Goa Trip)
            </button>
            <button
              type="button"
              className="badge-code-chip"
              onClick={() => setInviteCode('MNL492')}
            >
              MNL492 (Manali Trek)
            </button>
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
