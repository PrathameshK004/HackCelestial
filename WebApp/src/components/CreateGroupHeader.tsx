import React, { useState } from 'react';
import { HelpCircle, ShieldCheck, LogOut, Pencil, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CreateGroupHeaderProps {
  onHelpClick?: () => void;
}

export const CreateGroupHeader: React.FC<CreateGroupHeaderProps> = ({ onHelpClick }) => {
  const { user, logout, updateProfile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.username || '');
  const [profileUpi, setProfileUpi] = useState(user?.upiId || '');
  const [profileError, setProfileError] = useState('');

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
        <a href="#home" className="brand-logo" title="Triptual Home">
          <img
            src="/triptual-logo.png"
            alt="Triptual"
            style={{ width: '36px', height: '36px', borderRadius: '9999px', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>Triptual</div>
            <div className="brand-tagline">Group Travel & Smart Ledger</div>
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
                <button type="button" className="user-dropdown-item" onClick={() => { setProfileName(user?.username || ''); setProfileUpi(user?.upiId || ''); setProfileError(''); setShowDropdown(false); setShowProfile(true); }}><Pencil size={15} /><span>Edit Profile</span></button>
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
      {showProfile && <div className="modal-overlay" onClick={() => setShowProfile(false)}><div className="profile-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true"><button className="modal-close-btn" onClick={() => setShowProfile(false)} aria-label="Close profile editor"><X size={18} /></button><h2>Edit Profile</h2><p className="profile-dialog-copy">Update the name and UPI ID used for group settlements.</p><form onSubmit={async (event) => { event.preventDefault(); if (!profileName.trim() || !/^\w[\w.-]{1,}@[\w.-]+$/.test(profileUpi.trim())) { setProfileError('Enter a valid name and UPI ID, for example name@bank.'); return; } const result = await updateProfile({ username: profileName, upiId: profileUpi }); if (result.success) setShowProfile(false); else setProfileError(result.message || 'Could not update profile'); }}><label className="profile-field">Name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required /></label><label className="profile-field">UPI ID<input value={profileUpi} onChange={(event) => setProfileUpi(event.target.value)} placeholder="name@bank" required /></label>{profileError && <div className="field-error-msg">{profileError}</div>}<button className="primary-action" type="submit">Save profile</button></form></div></div>}
    </header>
  );
};
