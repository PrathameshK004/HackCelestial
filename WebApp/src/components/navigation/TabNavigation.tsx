import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Users,
  Zap,
  Plus,
  Compass,
  LogOut,
  User,
  CreditCard,
  HelpCircle,
  MoreVertical,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab = 'home' | 'groups' | 'settlement';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  groupCount?: number;
  pendingSettlementsCount?: number;
  onCreateGroupClick?: () => void;
  onOpenProfile: () => void;
  onOpenPaymentHistory: () => void;
  onOpenHelpSupport: () => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  groupCount = 3,
  pendingSettlementsCount = 2,
  onCreateGroupClick,
  onOpenProfile,
  onOpenPaymentHistory,
  onOpenHelpSupport,
}) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'ME';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.username || 'Yogesh Dandawalkar';
  const displayInitials = getInitials(displayName);
  const displayEmail = user?.emailId || 'yogesh@example.com';

  const handleAction = (cb: () => void) => {
    setShowDropdown(false);
    setShowMobileDrawer(false);
    cb();
  };

  return (
    <>
      {/* Top Navbar */}
      <header className="navbar-root">
        <div className="navbar-container">
          {/* Logo & Branding */}
          <div className="navbar-brand" onClick={() => onTabChange('home')}>
            <div className="navbar-logo-icon">
              <Compass size={22} strokeWidth={2.4} />
            </div>
            <div className="navbar-brand-info">
              <div className="navbar-title-row">
                <span className="navbar-title">GroupTrip</span>
                <span className="navbar-badge">LEDGER</span>
              </div>
            </div>
          </div>

          {/* Desktop Tabular Menu (3 Main Options) */}
          <nav className="desktop-tab-menu" aria-label="Main navigation">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => onTabChange('home')}
            >
              <Home size={17} />
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => onTabChange('groups')}
            >
              <Users size={17} />
              <span>My Groups</span>
              {groupCount > 0 && <span className="nav-tab-count">{groupCount}</span>}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'settlement' ? 'active' : ''}`}
              onClick={() => onTabChange('settlement')}
            >
              <Zap size={17} />
              <span>Settlement Engine</span>
              {pendingSettlementsCount > 0 && (
                <span className="nav-tab-count badge-amber">{pendingSettlementsCount}</span>
              )}
            </button>
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="navbar-actions">
            {onCreateGroupClick && (
              <button
                type="button"
                className="btn-create-trip-nav"
                onClick={onCreateGroupClick}
                title="Create a new trip"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>New Trip</span>
              </button>
            )}

            {/* Desktop Profile Button (Clicks open 6-option menu) */}
            <div className="desktop-profile-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className={`navbar-profile-chip ${showDropdown ? 'is-active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
                aria-haspopup="true"
                aria-expanded={showDropdown}
              >
                <div className="profile-chip-avatar">{displayInitials}</div>
                <div className="profile-chip-text">
                  <span className="profile-chip-name">{displayName.split(' ')[0]}</span>
                  <span className="profile-chip-role">Organizer</span>
                </div>
              </button>

              {/* 6-Option Dropdown Menu */}
              {showDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-user-summary">
                    <div className="summary-avatar">{displayInitials}</div>
                    <div className="summary-info">
                      <div className="summary-name">{displayName}</div>
                      <div className="summary-email">{displayEmail}</div>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* 1. Profile */}
                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => handleAction(onOpenProfile)}
                  >
                    <div className="link-icon-box bg-emerald">
                      <User size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title">1. Profile</span>
                      <span className="link-desc">Account & UPI details</span>
                    </div>
                    <ChevronRight size={14} className="link-chevron" />
                  </button>

                  {/* 2. My Groups */}
                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => handleAction(() => onTabChange('groups'))}
                  >
                    <div className="link-icon-box bg-blue">
                      <Users size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title">2. My Groups</span>
                      <span className="link-desc">{groupCount} active trips</span>
                    </div>
                    <ChevronRight size={14} className="link-chevron" />
                  </button>

                  {/* 3. Payment History */}
                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => handleAction(onOpenPaymentHistory)}
                  >
                    <div className="link-icon-box bg-purple">
                      <CreditCard size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title">3. Payment History</span>
                      <span className="link-desc">Receipts & audit trail</span>
                    </div>
                    <ChevronRight size={14} className="link-chevron" />
                  </button>

                  {/* 4. Settlements */}
                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => handleAction(() => onTabChange('settlement'))}
                  >
                    <div className="link-icon-box bg-amber">
                      <Zap size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title">4. Settlements</span>
                      <span className="link-desc">Smart debt minimization</span>
                    </div>
                    <ChevronRight size={14} className="link-chevron" />
                  </button>

                  {/* 5. Help & Support */}
                  <button
                    type="button"
                    className="dropdown-menu-link"
                    onClick={() => handleAction(onOpenHelpSupport)}
                  >
                    <div className="link-icon-box bg-teal">
                      <HelpCircle size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title">5. Help & Support</span>
                      <span className="link-desc">24/7 FAQs & resolution</span>
                    </div>
                    <ChevronRight size={14} className="link-chevron" />
                  </button>

                  <div className="dropdown-divider" />

                  {/* 6. Logout */}
                  <button
                    type="button"
                    className="dropdown-menu-link text-rose-item"
                    onClick={() => handleAction(logout)}
                  >
                    <div className="link-icon-box bg-rose">
                      <LogOut size={15} />
                    </div>
                    <div className="link-text">
                      <span className="link-title font-bold">6. Logout</span>
                      <span className="link-desc">End active session</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Three-Dot Button */}
            <button
              type="button"
              className="mobile-three-dot-trigger"
              onClick={() => setShowMobileDrawer(true)}
              aria-label="Open options menu"
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (iOS / Android App Style) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => onTabChange('groups')}
        >
          <div className="mobile-icon-badge-wrap">
            <Users size={19} />
            {groupCount > 0 && <span className="mobile-badge-num">{groupCount}</span>}
          </div>
          <span>Groups</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'settlement' ? 'active' : ''}`}
          onClick={() => onTabChange('settlement')}
        >
          <div className="mobile-icon-badge-wrap">
            <Zap size={19} />
            {pendingSettlementsCount > 0 && (
              <span className="mobile-badge-num badge-amber">{pendingSettlementsCount}</span>
            )}
          </div>
          <span>Settlement</span>
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setShowMobileDrawer(true)}
        >
          <MoreVertical size={19} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Drawer (6 Options) */}
      {showMobileDrawer && (
        <div className="mobile-drawer-overlay" onClick={() => setShowMobileDrawer(false)}>
          <div
            className="mobile-drawer-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-drag-pill" />
            
            <div className="drawer-header">
              <div className="drawer-user-info">
                <div className="drawer-avatar">{displayInitials}</div>
                <div>
                  <div className="drawer-user-name">{displayName}</div>
                  <div className="drawer-user-email">{displayEmail}</div>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setShowMobileDrawer(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-links-list">
              <button
                type="button"
                className="drawer-link-item"
                onClick={() => handleAction(onOpenProfile)}
              >
                <div className="link-icon-box bg-emerald">
                  <User size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold">1. Profile</div>
                  <div className="text-xs text-slate-500">View personal details & UPI ID</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                type="button"
                className="drawer-link-item"
                onClick={() => handleAction(() => onTabChange('groups'))}
              >
                <div className="link-icon-box bg-blue">
                  <Users size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold">2. My Groups</div>
                  <div className="text-xs text-slate-500">{groupCount} active travel ledgers</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                type="button"
                className="drawer-link-item"
                onClick={() => handleAction(onOpenPaymentHistory)}
              >
                <div className="link-icon-box bg-purple">
                  <CreditCard size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold">3. Payment History</div>
                  <div className="text-xs text-slate-500">Receipts & settlement audit logs</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                type="button"
                className="drawer-link-item"
                onClick={() => handleAction(() => onTabChange('settlement'))}
              >
                <div className="link-icon-box bg-amber">
                  <Zap size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold">4. Settlements</div>
                  <div className="text-xs text-slate-500">AI Minimum Cash Flow engine</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                type="button"
                className="drawer-link-item"
                onClick={() => handleAction(onOpenHelpSupport)}
              >
                <div className="link-icon-box bg-teal">
                  <HelpCircle size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold">5. Help & Support</div>
                  <div className="text-xs text-slate-500">24/7 FAQs, dispute desk & tickets</div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="drawer-link-item text-rose-item"
                onClick={() => handleAction(logout)}
              >
                <div className="link-icon-box bg-rose">
                  <LogOut size={18} />
                </div>
                <div className="drawer-link-text">
                  <div className="font-bold text-rose">6. Logout</div>
                  <div className="text-xs text-rose-400">Sign out of active account</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
