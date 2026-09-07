import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  CreditCard,
  Bell,
  Check,
  Camera,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfilePageProps {
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, logout, updateProfile } = useAuth();

  // Profile Form States
  const [username, setUsername] = useState(user?.username || 'Yogesh Dandawalkar');
  const [email, setEmail] = useState(user?.emailId || 'yogesh@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [upiId, setUpiId] = useState(user?.upiId || 'yogesh@okaxis');
  const [defaultCurrency, setDefaultCurrency] = useState('INR (₹)');
  const [travelStyle, setTravelStyle] = useState<'Boutique' | 'Coastal' | 'Nature' | 'Urban'>('Boutique');
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [autoSettleReminders, setAutoSettleReminders] = useState(true);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const displayName = username || user?.username || 'Traveler';
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (updateProfile) {
        await updateProfile({
          username: username.trim(),
          upiId: upiId.trim()
        });
      }
      setSaveMessage('Profile & UPI settlement details saved successfully!');
    } catch (err: any) {
      setSaveMessage(err.message || 'Profile saved locally.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title + Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-back-transparent"
              onClick={onBack}
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft size={22} color="var(--text-primary)" />
            </button>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.2rem',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              My Profile
            </h1>
          </div>

          <button
            type="button"
            className="profile-header-icon-btn profile-logout-btn"
            onClick={logout}
            title="Sign out of session"
            style={{ padding: '6px 12px', fontSize: '0.74rem' }}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>

        {/* Alert / Notice Message */}
        {saveMessage && (
          <div className="auth-modern-alert alert-success" style={{ marginBottom: '16px' }}>
            <Check size={16} />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* 1. Aligned User Identity Card */}
        <section
          className="clean-section-card"
          style={{
            padding: '16px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              className="profile-avatar-giant"
              style={{
                width: '56px',
                height: '56px',
                fontSize: '1.3rem',
                flexShrink: 0,
                position: 'relative'
              }}
            >
              <span>{displayInitials}</span>
              <div
                className="avatar-edit-fab"
                title="Upload avatar"
                style={{ width: '20px', height: '20px', bottom: '-2px', right: '-2px' }}
              >
                <Camera size={11} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.15rem',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2
                }}
              >
                {displayName}
              </h2>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all'
                }}
              >
                {email}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Key Metrics Row */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="profile-stat-val">12</div>
            <div className="profile-stat-label">Trips Planned</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val" style={{ color: 'var(--accent-olive)' }}>
              100%
            </div>
            <div className="profile-stat-label">Settled Splits</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val">★ 4.96</div>
            <div className="profile-stat-label">Traveler Rating</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val">Zero</div>
            <div className="profile-stat-label">Pending Debts</div>
          </div>
        </div>

        {/* 3. Main Two-Column Settings Grid */}
        <form onSubmit={handleSaveProfile}>
          <div className="profile-sections-grid">
            {/* Column 1: Personal Identity & Payment Defaults */}
            <div>
              {/* Personal Details */}
              <div className="profile-card-section">
                <div className="profile-card-header">
                  <div className="profile-card-title-row">
                    <div className="profile-card-icon-pill">
                      <User size={18} />
                    </div>
                    <h3 className="profile-card-title">Personal Details</h3>
                  </div>
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Full Name</label>
                  <input
                    type="text"
                    className="styled-text-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Registered Email</label>
                  <input
                    type="email"
                    className="styled-text-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Phone / WhatsApp Number</label>
                  <input
                    type="tel"
                    className="styled-text-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Preferred Travel Aesthetic</label>
                  <div className="category-pills-bar" style={{ padding: '4px 0' }}>
                    {(['Boutique', 'Coastal', 'Nature', 'Urban'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        className={`category-pill ${travelStyle === style ? 'active' : ''}`}
                        onClick={() => setTravelStyle(style)}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment & UPI Defaults */}
              <div className="profile-card-section">
                <div className="profile-card-header">
                  <div className="profile-card-title-row">
                    <div className="profile-card-icon-pill">
                      <CreditCard size={18} />
                    </div>
                    <h3 className="profile-card-title">Payment & UPI Defaults</h3>
                  </div>
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Default UPI Virtual Address (VPA)</label>
                  <input
                    type="text"
                    className="styled-text-input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. username@okaxis"
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Group members will settle debts directly to this UPI address.
                  </span>
                </div>

                <div className="form-group-block">
                  <label className="form-group-label">Default Ledger Currency</label>
                  <select
                    className="styled-select-input"
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                  >
                    <option value="INR (₹)">INR (₹) — Indian Rupee</option>
                    <option value="USD ($)">USD ($) — US Dollar</option>
                    <option value="EUR (€)">EUR (€) — Euro</option>
                    <option value="GBP (£)">GBP (£) — British Pound</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 2: Notification & Settle Alerts */}
            <div>
              {/* Notification & Settle Alerts */}
              <div className="profile-card-section">
                <div className="profile-card-header">
                  <div className="profile-card-title-row">
                    <div className="profile-card-icon-pill">
                      <Bell size={18} />
                    </div>
                    <h3 className="profile-card-title">Instant Alerts</h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label className="notification-toggle-row" style={{ cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        WhatsApp Settlement Alerts
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Receive instant UPI payment links when a bill is split
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="auth-clean-checkbox"
                      checked={whatsappAlerts}
                      onChange={(e) => setWhatsappAlerts(e.target.checked)}
                    />
                  </label>

                  <label className="notification-toggle-row" style={{ cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        Auto-Debt Reconciliation
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Recalculate minimum debt transfer routes upon new bills
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="auth-clean-checkbox"
                      checked={autoSettleReminders}
                      onChange={(e) => setAutoSettleReminders(e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Save Bar */}
          <div className="profile-save-bar">
            <div className="profile-save-bar-inner">
              <div className="profile-save-bar-hint">
                Make sure to save your UPI Virtual Address for accurate debt settling.
              </div>

              <div className="profile-save-bar-actions">
                <button type="button" className="btn-secondary-pill" onClick={onBack}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-pill" disabled={isSaving}>
                  <Check size={16} />
                  <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
