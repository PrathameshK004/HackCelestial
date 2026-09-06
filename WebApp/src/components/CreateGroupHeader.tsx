import React, { useState, useEffect } from 'react';
import { Compass, HelpCircle, ShieldCheck, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/group.service';
import { PendingInvitation } from '../types/group';
import { PendingInvitesModal } from './PendingInvitesModal';

interface CreateGroupHeaderProps {
  onHelpClick?: () => void;
}

export const CreateGroupHeader: React.FC<CreateGroupHeaderProps> = ({ onHelpClick }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [isInvitesModalOpen, setIsInvitesModalOpen] = useState(false);

  const fetchPendingInvites = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await groupService.getMyPendingInvitations();
      if (res.data && Array.isArray(res.data)) {
        setPendingInvites(res.data);
      }
    } catch (e) {
      console.warn("Could not load pending invites:", e);
    }
  };

  useEffect(() => {
    fetchPendingInvites();
    const interval = setInterval(fetchPendingInvites, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Generate initials from username or fallback
  const getInitials = (name?: string) => {
    if (!name) return 'ME';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.username || 'Organizer Account';
  const displayInitials = getInitials(user?.username);

  return (
    <header className="header-wrapper">
      <div className="header-inner">
        <a href="#home" className="brand-logo" title="GroupTrip Ledger Home">
          <div className="brand-icon-box">
            <Compass size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div>GroupTrip Ledger</div>
            <div className="brand-tagline">Travel & Expense Hub</div>
          </div>
        </a>

        <div className="header-right">
          {/* Pending Invitations Tray Button */}
          {isAuthenticated && (
            <button 
              type="button" 
              className={`header-invites-btn ${pendingInvites.length > 0 ? 'has-invites' : ''}`}
              onClick={() => setIsInvitesModalOpen(true)} 
              title={pendingInvites.length > 0 
                ? `${pendingInvites.length} pending trip invitation${pendingInvites.length === 1 ? '' : 's'} waiting for approval`
                : "View pending invitations"}
            >
              <Mail size={16} />
              <span>Invites</span>
              {pendingInvites.length > 0 && (
                <span className="header-invites-badge">{pendingInvites.length}</span>
              )}
            </button>
          )}

          <button 
            type="button" 
            className="help-btn" 
            onClick={onHelpClick} 
            title="Need help setting up your group?"
          >
            <HelpCircle size={16} />
            <span>Help & FAQ</span>
          </button>

          {/* User Profile Chip with Dropdown */}
          <div className="user-profile-wrapper">
            <button 
              type="button"
              className="user-profile-chip-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title="View Account Details"
            >
              <div className="user-avatar">{displayInitials}</div>
              <div className="user-info">
                <span className="user-name">{displayName}</span>
                <span className="user-role">
                  <ShieldCheck size={11} style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />
                  Organizer
                </span>
              </div>
            </button>

            {showDropdown && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="dropdown-user-name">{displayName}</div>
                  {user?.emailId && <div className="dropdown-user-email">{user.emailId}</div>}
                </div>
                <div className="user-dropdown-divider"></div>
                <button
                  type="button"
                  className="user-dropdown-item text-rose"
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Invitations Tray Modal */}
      <PendingInvitesModal
        isOpen={isInvitesModalOpen}
        onClose={() => setIsInvitesModalOpen(false)}
        invitations={pendingInvites}
        onInviteHandled={fetchPendingInvites}
      />
    </header>
  );
};
