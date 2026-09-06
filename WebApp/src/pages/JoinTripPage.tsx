import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Users, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  LogIn, 
  UserCheck, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { groupService } from '../services/group.service';
import { useAuth } from '../context/AuthContext';
import { InviteDetails } from '../types/group';

interface JoinTripPageProps {
  inviteCode: string;
  onNavigateHome: () => void;
  onRequireAuth: (returnUrl?: string) => void;
}

export const JoinTripPage: React.FC<JoinTripPageProps> = ({
  inviteCode,
  onNavigateHome,
  onRequireAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [decisionState, setDecisionState] = useState<'IDLE' | 'ACCEPTED' | 'REJECTED'>('IDLE');

  useEffect(() => {
    let isMounted = true;
    async function loadDetails() {
      setIsLoading(true);
      setActionError(null);
      try {
        const res = await groupService.getInviteDetails(inviteCode);
        if (isMounted) {
          if (res.data) {
            setInviteDetails(res.data);
            if (res.data.status === 'ACCEPTED') {
              setDecisionState('ACCEPTED');
            } else if (res.data.status === 'REJECTED') {
              setDecisionState('REJECTED');
            }
          } else {
            setActionError(res.message || 'Invitation not found');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setActionError(err.message || 'Unable to load invitation details. The link may have expired or is invalid.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (inviteCode) {
      loadDetails();
    }
    return () => {
      isMounted = false;
    };
  }, [inviteCode]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      onRequireAuth(window.location.href);
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await groupService.acceptInvite(inviteCode);
      setDecisionState('ACCEPTED');
      setActionSuccess(res.message || `You have officially joined "${inviteDetails?.groupName}"!`);
    } catch (err: any) {
      console.error('Accept invite error:', err);
      setActionError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!isAuthenticated) {
      onRequireAuth(window.location.href);
      return;
    }

    if (!window.confirm(`Are you sure you want to decline the invitation to join "${inviteDetails?.groupName}"?`)) {
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await groupService.rejectInvite(inviteCode);
      setDecisionState('REJECTED');
      setActionSuccess(res.message || 'Invitation declined.');
    } catch (err: any) {
      console.error('Reject invite error:', err);
      setActionError(err.message || 'Failed to decline invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'TR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="join-trip-container">
        <div className="join-trip-card loading-card">
          <div className="brand-icon-box brand-icon-pulse" style={{ margin: '0 auto 16px auto' }}>
            <Compass size={28} strokeWidth={2.4} />
          </div>
          <h2>Loading Official Invitation...</h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
            Verifying invitation token <code>{inviteCode}</code>
          </p>
          <Loader2 size={24} className="spin-animation text-emerald" style={{ marginTop: '12px' }} />
        </div>
      </div>
    );
  }

  if (actionError && !inviteDetails) {
    return (
      <div className="join-trip-container">
        <div className="join-trip-card error-card" style={{ maxWidth: '520px' }}>
          <div className="join-error-icon-box">
            <AlertCircle size={32} color="#e11d48" />
          </div>
          <h2>Invalid or Expired Invitation</h2>
          <p style={{ color: 'var(--slate-600)', margin: '12px 0 20px 0', lineHeight: 1.5 }}>
            {actionError}
          </p>
          <button type="button" className="btn btn-primary" onClick={onNavigateHome}>
            Go to Platform Home
          </button>
        </div>
      </div>
    );
  }

  const startDateFormatted = formatDate(inviteDetails?.startDate);
  const endDateFormatted = formatDate(inviteDetails?.endDate);

  return (
    <div className="join-trip-container">
      {/* Brand Header */}
      <header className="join-page-header">
        <div className="brand-logo" onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-box">
            <Compass size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--slate-900)' }}>GroupTrip Ledger</div>
            <div className="brand-tagline">Official Team & Trip Workspace</div>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="user-profile-chip-btn" style={{ cursor: 'default' }}>
            <div className="user-avatar">{getInitials(user.username)}</div>
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              <span className="user-role">{user.emailId}</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Invitation Box */}
      <div className="join-trip-card">
        {/* Top Banner */}
        <div className="join-trip-banner">
          <div className="join-badge-row">
            <span className="join-status-pill pending">
              <Mail size={13} />
              <span>Official Invitation • Approval Required</span>
            </span>
            <span className="invite-code-pill">Code: {inviteCode}</span>
          </div>

          <h1 className="join-group-name">{inviteDetails?.groupName}</h1>
          <div className="join-destination-row">
            <MapPin size={18} className="text-emerald-600" />
            <span>{inviteDetails?.destination}</span>
            <span className="dest-separator">•</span>
            <span className="trip-type-pill" style={{ marginLeft: 0 }}>
              {inviteDetails?.tripType || 'Trip'}
            </span>
          </div>
        </div>

        {/* Inviter Info Strip */}
        <div className="join-inviter-strip">
          <div className="inviter-avatar">{getInitials(inviteDetails?.organizerName)}</div>
          <div className="inviter-meta">
            <span className="inviter-label">Invited by Organizer</span>
            <strong className="inviter-name">{inviteDetails?.organizerName}</strong>
          </div>
          <div className="inviter-shield">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Verified Organizer</span>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="join-details-grid">
          <div className="join-detail-item">
            <span className="join-detail-label">
              <Calendar size={15} />
              <span>Trip Dates</span>
            </span>
            <strong className="join-detail-value">
              {startDateFormatted && endDateFormatted ? `${startDateFormatted} – ${endDateFormatted}` : 'Dates flexible'}
            </strong>
          </div>

          <div className="join-detail-item">
            <span className="join-detail-label">
              <Coins size={15} />
              <span>Currency & Split</span>
            </span>
            <strong className="join-detail-value">
              {inviteDetails?.currency} ({inviteDetails?.expenseSplit} split)
            </strong>
          </div>

          <div className="join-detail-item">
            <span className="join-detail-label">
              <Users size={15} />
              <span>Confirmed Members</span>
            </span>
            <strong className="join-detail-value">
              {inviteDetails?.memberCount} {inviteDetails?.memberCount === 1 ? 'Member' : 'Members'} Joined
            </strong>
          </div>
        </div>

        {/* Description Note if any */}
        {inviteDetails?.description && (
          <div className="join-notes-box">
            <span className="join-notes-title">Trip Notes:</span>
            <p className="join-notes-text">{inviteDetails.description}</p>
          </div>
        )}

        {/* Current Members Roster Preview */}
        {inviteDetails?.members && inviteDetails.members.length > 0 && (
          <div className="join-members-preview">
            <span className="join-section-title">
              Trip Roster ({inviteDetails.members.length})
            </span>
            <div className="join-members-list">
              {inviteDetails.members.map((m) => {
                const isAccepted = m.status === 'ACCEPTED';
                return (
                  <div key={m.id} className="join-member-chip">
                    <div className="join-member-avatar" style={{ backgroundColor: m.avatarBg || '#059669' }}>
                      {getInitials(m.name)}
                    </div>
                    <div className="join-member-info">
                      <span className="join-member-name">{m.name}</span>
                      <span className="join-member-sub">
                        {m.role === 'Organizer' ? 'Organizer' : isAccepted ? 'Joined' : 'Invite Pending'}
                      </span>
                    </div>
                    {m.role === 'Organizer' ? (
                      <span className="confirm-role-pill role-org">Organizer</span>
                    ) : isAccepted ? (
                      <span className="confirm-role-pill role-trav">Joined</span>
                    ) : (
                      <span className="traveler-role-tag invite-tag" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        <Mail size={10} />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action / State Area */}
        <div className="join-action-box">
          {actionError && (
            <div className="join-alert-box alert-error">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="join-alert-box alert-success">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {decisionState === 'ACCEPTED' ? (
            <div className="join-decision-banner accepted">
              <div className="decision-icon">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <div>
                <h4>You are an Active Member!</h4>
                <p>You have approved this invitation. You can now access group bookings and shared ledgers.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={onNavigateHome} style={{ marginLeft: 'auto' }}>
                <span>Enter Trip Workspace</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : decisionState === 'REJECTED' ? (
            <div className="join-decision-banner rejected">
              <div className="decision-icon">
                <XCircle size={24} className="text-rose-600" />
              </div>
              <div>
                <h4>Invitation Declined</h4>
                <p>You have declined to join this trip group. You can return home anytime.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={onNavigateHome} style={{ marginLeft: 'auto' }}>
                Return to Home
              </button>
            </div>
          ) : !isAuthenticated ? (
            <div className="join-auth-prompt">
              <div className="auth-prompt-headline">
                <Sparkles size={18} className="text-emerald-600" />
                <strong>Sign in to review and approve your membership</strong>
              </div>
              <p className="auth-prompt-text">
                This official invitation requires authentication so you can securely be linked to the group expense ledger.
              </p>
              <div className="auth-prompt-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onRequireAuth(window.location.href)}
                >
                  <LogIn size={16} />
                  <span>Log In to Accept Invitation</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onRequireAuth(window.location.href)}
                >
                  <span>Create Account</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="join-approval-actions">
              <div className="approval-notice">
                <UserCheck size={16} className="text-emerald-600" />
                <span>
                  Clicking <strong>"Approve & Join Group"</strong> will officially add you to <strong>{inviteDetails?.groupName}</strong> and initialize your personal expense share.
                </span>
              </div>

              <div className="approval-buttons-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-decline"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <XCircle size={16} />
                  <span>Decline</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-approve"
                  onClick={handleAccept}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="spin-animation" />
                      <span>Approving & Joining...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Approve & Join Group</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
