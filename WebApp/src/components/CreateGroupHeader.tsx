import React, { useState } from 'react';
import { Compass, HelpCircle, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreateGroupHeaderProps {
  onHelpClick?: () => void;
}

export const CreateGroupHeader: React.FC<CreateGroupHeaderProps> = ({ onHelpClick }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

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
    </header>
  );
};
