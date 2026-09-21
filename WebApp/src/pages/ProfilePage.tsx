import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  Check,
  Camera,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Loader2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TreePalm,
  Trees,
  Building,
  Mountain,
  Calendar,
  Wifi
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { IllustrationAvatar } from '../components/IllustrationAvatar';
import { IllustrationPickerModal } from '../components/IllustrationPickerModal';

interface ProfilePageProps {
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, updateProfile, refreshProfile, changePassword } = useAuth();

  // Profile Form States
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.emailId || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [defaultCurrency, setDefaultCurrency] = useState(user?.currency || 'INR');
  const [travelStyle, setTravelStyle] = useState<'Boutique' | 'Coastal' | 'Nature' | 'Urban' | 'Mountain'>(
    (user?.travelStyle as any) || 'Boutique'
  );

  // Google-Style Illustration Picker Modal state
  const [showIllustrationModal, setShowIllustrationModal] = useState(false);

  const handleSelectIllustration = async (newAvatar: string | null) => {
    setAvatar(newAvatar || '');
    try {
      await updateProfile({
        avatar: newAvatar || undefined,
        username: username.trim(),
        phone: phone.trim(),
        dob: dob ? dob.trim() : null,
        upiId: upiId.trim(),
        travelStyle,
        currency: defaultCurrency,
      });
      setProfileSuccessMsg(
        newAvatar
          ? 'Profile illustration updated successfully in database!'
          : 'Switched to initials avatar.'
      );
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile picture.');
    }
  };

  // Security & Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Online connection status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real database profile on mount
  useEffect(() => {
    refreshProfile?.().catch(console.error);
  }, []);

  // Sync state when user updates in context
  useEffect(() => {
    if (user) {
      if (user.username !== undefined) setUsername(user.username || '');
      if (user.emailId !== undefined) setEmail(user.emailId || '');
      if (user.phone !== undefined) setPhone(user.phone || '');
      if (user.dob !== undefined && user.dob !== null) setDob(user.dob || '');
      if (user.upiId !== undefined) setUpiId(user.upiId || '');
      if (user.avatar !== undefined) setAvatar(user.avatar || '');
      if (user.travelStyle) setTravelStyle(user.travelStyle as any);
      if (user.currency) setDefaultCurrency(user.currency);
    }
  }, [user]);

  const displayName = username || user?.username || '';

  // Real-time Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await updateProfile({
        username: username.trim(),
        phone: phone.trim(),
        dob: dob ? dob.trim() : null,
        upiId: upiId.trim(),
        avatar: avatar || undefined,
        travelStyle,
        currency: defaultCurrency
      });

      if (!res.success) {
        setProfileErrorMsg(res.message || 'Failed to update profile.');
      } else {
        setProfileSuccessMsg(res.message || 'Profile updated successfully in database!');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => {
        setProfileSuccessMsg(null);
        setProfileErrorMsg(null);
      }, 4000);
    }
  };

  // Security: Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordErrorMsg('New password must be different from current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword
      });

      if (res.success) {
        setPasswordSuccessMsg('Password updated successfully! Keep your credentials safe.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordErrorMsg(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setPasswordErrorMsg(err.message || 'Error updating password.');
    } finally {
      setIsUpdatingPassword(false);
      setTimeout(() => {
        setPasswordSuccessMsg(null);
        setPasswordErrorMsg(null);
      }, 5000);
    }
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 16px 40px' }}>
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
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ArrowLeft size={22} color="var(--text-primary)" />
            </button>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              My Profile & Security
            </h1>
          </div>

          <div
            title={isOnline ? 'Online & Connected' : 'Offline Mode'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isOnline ? '#ecfdf5' : '#fef2f2',
              border: isOnline ? '1.5px solid #a7f3d0' : '1.5px solid #fecaca',
              color: isOnline ? '#10b981' : '#ef4444',
              transition: 'all 0.2s ease',
            }}
          >
            <Wifi size={18} strokeWidth={2.3} />
          </div>
        </div>

        {/* Global Notices */}
        {profileSuccessMsg && (
          <div className="auth-modern-alert alert-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={16} />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div className="auth-modern-alert alert-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        {/* 1. Aligned User Identity Card with Live Avatar */}
        <section
          className="clean-section-card"
          style={{
            padding: '18px 20px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.05) 0%, rgba(16, 185, 129, 0.08) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <IllustrationAvatar
                avatar={avatar}
                name={displayName}
                size={64}
                onClick={() => setShowIllustrationModal(true)}
              />
              <button
                type="button"
                className="avatar-edit-fab"
                title="Change Illustration Picture"
                onClick={() => setShowIllustrationModal(true)}
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: '1.5px solid #059669',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  zIndex: 3,
                }}
              >
                <Camera size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.25rem',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.2
                  }}
                >
                  {displayName}
                </h2>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0'
                  }}
                >
                  Active Member
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  wordBreak: 'break-all'
                }}
              >
                {email}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
              Live Synced
            </span>
          </div>
        </section>

        {/* Google-Style Profile Illustration Picker Modal */}
        <IllustrationPickerModal
          isOpen={showIllustrationModal}
          onClose={() => setShowIllustrationModal(false)}
          selectedIllustrationId={avatar}
          onSelect={handleSelectIllustration}
          userName={displayName}
        />

        {/* 2. Key Metrics Row */}
        <div className="profile-stats-grid" style={{ marginBottom: '20px' }}>
          <div className="profile-stat-box">
            <div className="profile-stat-val">12</div>
            <div className="profile-stat-label">Trips Joined</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val" style={{ color: '#059669' }}>
              100%
            </div>
            <div className="profile-stat-label">Settled Splits</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val">★ 4.96</div>
            <div className="profile-stat-label">Rating</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val" style={{ color: '#059669' }}>
              Active
            </div>
            <div className="profile-stat-label">Ledger Sync</div>
          </div>
        </div>

        {/* 3. Main Form: Personal & Payment Defaults */}
        <form onSubmit={handleSaveProfile} style={{ marginBottom: '28px' }}>
          <div className="profile-sections-grid">
            {/* Personal Details */}
            <div className="profile-card-section">
              <div className="profile-card-header">
                <div className="profile-card-title-row">
                  <div className="profile-card-icon-pill">
                    <UserIcon size={18} />
                  </div>
                  <h3 className="profile-card-title">Personal Information</h3>
                </div>
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Full Name</label>
                <input
                  type="text"
                  className="styled-text-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Email Address (Primary)</label>
                <input
                  type="email"
                  className="styled-text-input"
                  value={email}
                  disabled
                  title="Registered primary email cannot be edited directly"
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Phone / WhatsApp Number</label>
                <div className="auth-input-relative-wrap">
                  <Smartphone size={17} className="auth-input-leading-icon" />
                  <input
                    type="tel"
                    className="styled-text-input"
                    style={{ paddingLeft: '40px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Date of Birth</label>
                <div className="auth-input-relative-wrap">
                  <Calendar size={17} className="auth-input-leading-icon" />
                  <input
                    type="date"
                    className="styled-text-input"
                    style={{ paddingLeft: '40px' }}
                    value={dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Preferred Travel Style</label>
                <div
                  className="category-pills-bar"
                  style={{
                    display: 'flex',
                    gap: '8px',
                    width: '100%',
                    padding: '4px 0',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {[
                    { style: 'Boutique', icon: Sparkles },
                    { style: 'Coastal', icon: TreePalm },
                    { style: 'Nature', icon: Trees },
                    { style: 'Mountain', icon: Mountain },
                    { style: 'Urban', icon: Building }
                  ].map(({ style, icon: StyleIcon }) => (
                    <button
                      key={style}
                      type="button"
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        whiteSpace: 'nowrap'
                      }}
                      className={`category-pill ${travelStyle === style ? 'active' : ''}`}
                      onClick={() => setTravelStyle(style as any)}
                    >
                      <StyleIcon size={14} />
                      <span>{style}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment & Settlement Defaults */}
            <div className="profile-card-section">
              <div className="profile-card-header">
                <div className="profile-card-title-row">
                  <div className="profile-card-icon-pill">
                    <CreditCard size={18} />
                  </div>
                  <h3 className="profile-card-title">Payment & UPI Settlement</h3>
                </div>
              </div>

              <div className="form-group-block">
                <label className="form-group-label">Default UPI Virtual Address (VPA)</label>
                <input
                  type="text"
                  className="styled-text-input"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okaxis or yourname@oksbi"
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Trip members can settle bills directly to this UPI address.
                </span>
              </div>
            </div>
          </div>

          {/* Profile Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button
              type="submit"
              className="btn-primary-pill"
              disabled={isSavingProfile}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)'
              }}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 size={16} className="spin-animation" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 4. Dedicated Security: Password Update Section */}
        <section
          className="clean-section-card"
          style={{
            padding: '22px 24px',
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}
        >
          <div className="profile-card-header" style={{ marginBottom: '16px' }}>
            <div className="profile-card-title-row">
              <div
                className="profile-card-icon-pill"
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a'
                }}
              >
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="profile-card-title" style={{ margin: 0 }}>
                  Security & Password Update
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Update your account password to maintain security.
                </span>
              </div>
            </div>
          </div>

          {passwordSuccessMsg && (
            <div className="auth-modern-alert alert-success" style={{ marginBottom: '14px' }}>
              <CheckCircle2 size={16} />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="auth-modern-alert alert-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={16} />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {/* Current Password */}
              <div className="form-group-block">
                <label className="form-group-label">Current Password</label>
                <div className="auth-input-relative-wrap">
                  <Lock size={17} className="auth-input-leading-icon" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="styled-text-input"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordErrorMsg) setPasswordErrorMsg(null);
                    }}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group-block">
                <label className="form-group-label">New Password</label>
                <div className="auth-input-relative-wrap">
                  <Lock size={17} className="auth-input-leading-icon" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="styled-text-input"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordErrorMsg) setPasswordErrorMsg(null);
                    }}
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group-block">
                <label className="form-group-label">Confirm New Password</label>
                <div className="auth-input-relative-wrap">
                  <ShieldCheck size={17} className="auth-input-leading-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="styled-text-input"
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordErrorMsg) setPasswordErrorMsg(null);
                    }}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <CheckCircle2 size={13} /> Passwords match
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: (isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
                  opacity: (isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword) ? 0.65 : 1,
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
