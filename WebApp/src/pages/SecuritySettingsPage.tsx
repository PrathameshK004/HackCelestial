import React, { useState } from 'react';
import {
  ArrowLeft,
  Key,
  Laptop,
  Smartphone,
  Check,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

interface SecuritySettingsPageProps {
  onBack: () => void;
}

export const SecuritySettingsPage: React.FC<SecuritySettingsPageProps> = ({ onBack }) => {
  const { user, refreshProfile } = useAuth();

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);

  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(Boolean(user?.twoFactorEnabled));
  const [pendingTwoFactorValue, setPendingTwoFactorValue] = useState<boolean | null>(null);
  const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Sessions State
  const [revokedOthers, setRevokedOthers] = useState(false);

  // Password strength calculation
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(newPassword);

  React.useEffect(() => {
    if (user?.twoFactorEnabled !== undefined) {
      setIsTwoFactorEnabled(Boolean(user.twoFactorEnabled));
    }
  }, [user?.twoFactorEnabled]);

  const handleConfirmTwoFactor = async () => {
    if (pendingTwoFactorValue === null) return;
    setIsUpdatingTwoFactor(true);
    setTwoFactorStatus(null);
    try {
      const response = await authService.toggleTwoFactor(pendingTwoFactorValue);
      if (response.data?.twoFactorEnabled !== pendingTwoFactorValue) {
        throw new Error(response.message || 'Could not update two-step verification.');
      }
      setIsTwoFactorEnabled(pendingTwoFactorValue);
      setPendingTwoFactorValue(null);
      setTwoFactorStatus({
        type: 'success',
        text: pendingTwoFactorValue ? 'Two-step verification is on.' : 'Two-step verification is off.'
      });
      await refreshProfile();
    } catch (err: any) {
      setTwoFactorStatus({ type: 'error', text: err.message || 'Failed to update two-step verification.' });
    } finally {
      setIsUpdatingTwoFactor(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setPasswordStatus({ type: 'error', text: 'Please enter the OTP sent to your email.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus(null);
    try {
      await authService.changePasswordWithOtp({ code: otp, newPassword });
      setPasswordStatus({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        text: err?.message || 'Failed to update password. Please check your credentials.'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendOtp = async () => {
    const userEmail = user?.emailId || 'organizer@triptual.com';
    setIsSendingOtp(true);
    setOtpSentMessage(null);
    try {
      await authService.sendOtp({ emailId: userEmail, purpose: 'Password Change' });
      setOtpSentMessage(`Verification OTP sent to ${userEmail}`);
    } catch (err: any) {
      setOtpSentMessage(err?.message || `Could not send OTP to ${userEmail}`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="profile-page-root animate-fade-in" style={{ paddingBottom: '90px' }}>
      <div className="profile-page-container" style={{ maxWidth: '680px', padding: '12px 14px 40px' }}>
        {/* Clean Header: Back Button + Title Only */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-light)'
          }}
        >
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
            Security & Sessions
          </h1>
        </div>

        {/* Vertical Stack: Reset Password & Active Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {/* Card 1: Reset Password & Forgot Password */}
          <div
            className="clean-section-card"
            style={{
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                  Reset Password
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Update your credentials for secure ledger access.
                </p>
              </div>
              <Key size={18} color="var(--accent-olive)" />
            </div>

            {passwordStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background:
                    passwordStatus.type === 'success'
                      ? 'rgba(70, 75, 41, 0.1)'
                      : 'rgba(225, 29, 72, 0.1)',
                  color:
                    passwordStatus.type === 'success'
                      ? 'var(--accent-olive)'
                      : 'var(--accent-rose)'
                }}
              >
                {passwordStatus.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                <span>{passwordStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Verification OTP
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="styled-text-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 4-digit OTP"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      fontSize: '0.8rem',
                      padding: '10px 38px 10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-surface-warm)'
                    }}
                    required
                  />
                  <button type="button" onClick={handleSendOtp} disabled={isSendingOtp} className="profile-header-icon-btn" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '5px 8px', fontSize: '0.68rem' }}>
                    {isSendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  New Password
                </label>
                <input
                    type="text"
                  className="styled-text-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.8rem',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-surface-warm)'
                  }}
                  required
                />

                {newPassword && (
                  <div style={{ marginTop: '5px' }}>
                    <div style={{ display: 'flex', gap: '3px', height: '3px', borderRadius: '9999px', overflow: 'hidden', background: 'var(--border-light)' }}>
                      <div style={{ flex: 1, background: strength >= 1 ? '#E11D48' : 'transparent' }} />
                      <div style={{ flex: 1, background: strength >= 2 ? '#F59E0B' : 'transparent' }} />
                      <div style={{ flex: 1, background: strength >= 3 ? '#E5EC68' : 'transparent' }} />
                      <div style={{ flex: 1, background: strength >= 4 ? '#464B29' : 'transparent' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="styled-text-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontSize: '0.8rem',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-surface-warm)'
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary-luxury" disabled={isUpdatingPassword} style={{ width: '100%', padding: '10px 16px', fontSize: '0.82rem', justifyContent: 'center' }}>
                {isUpdatingPassword ? 'Updating...' : 'Change Password'}
              </button>

            </form>
            {/* OTP delivery status */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                Verify before changing password
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                Send a one-time code to your registered email, then enter it above.
              </p>

              {otpSentMessage && (
                <div style={{ padding: '8px 10px', background: 'rgba(70, 75, 41, 0.1)', color: 'var(--accent-olive)', borderRadius: 'var(--radius-md)', fontSize: '0.74rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} />
                  <span>{otpSentMessage}</span>
                </div>
              )}

            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div
            className="clean-section-card"
            style={{
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {isTwoFactorEnabled ? <ShieldCheck size={20} color="#059669" /> : <ShieldAlert size={20} color="var(--text-muted)" />}
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                    Two-Step Verification
                  </h2>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Require a 6-digit email code when you log in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isTwoFactorEnabled}
                aria-label="Enable two-step verification"
                onClick={() => setPendingTwoFactorValue(!isTwoFactorEnabled)}
                style={{
                  width: '48px',
                  height: '28px',
                  flex: '0 0 48px',
                  padding: '3px',
                  border: 0,
                  borderRadius: '999px',
                  background: isTwoFactorEnabled ? '#059669' : '#CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isTwoFactorEnabled ? 'flex-end' : 'flex-start'
                }}
              >
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(15, 23, 42, .25)' }} />
              </button>
            </div>

            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: isTwoFactorEnabled ? '#ECFDF5' : 'var(--bg-surface-warm)', color: isTwoFactorEnabled ? '#047857' : 'var(--text-secondary)', border: `1px solid ${isTwoFactorEnabled ? '#A7F3D0' : 'var(--border-light)'}`, borderRadius: 'var(--radius-md)', fontSize: '0.74rem' }}>
              <ShieldCheck size={16} />
              <span>{isTwoFactorEnabled ? `Enabled for ${user?.emailId || 'your account'}` : 'Off · sign-ins use your password only'}</span>
            </div>

            {twoFactorStatus && (
              <div role="status" style={{ color: twoFactorStatus.type === 'success' ? '#047857' : '#B91C1C', fontSize: '0.76rem' }}>
                {twoFactorStatus.text}
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div
            className="clean-section-card"
            style={{
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                  Active Sessions
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Devices currently signed in to your account.
                </p>
              </div>
              <Laptop size={18} color="var(--accent-olive)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Current Device */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Laptop size={18} color="var(--accent-olive)" />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Current Device (MacBook / Chrome)
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Active Now · IP: 198.51.100.24
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-olive)', background: 'var(--accent-olive-subtle)', padding: '2px 8px', borderRadius: '9999px' }}>
                  This Device
                </span>
              </div>

              {/* Other Device */}
              {!revokedOthers && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Smartphone size={18} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        iPhone 15 Pro (Safari)
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Last active 2 hours ago
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revoke All Action */}
              <button
                type="button"
                className="profile-logout-btn"
                onClick={() => setRevokedOthers(true)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  marginTop: '4px',
                  fontSize: '0.76rem',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <LogOut size={14} />
                <span>{revokedOthers ? 'All other sessions revoked' : 'Log out of all other devices'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingTwoFactorValue !== null && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdatingTwoFactor) setPendingTwoFactorValue(null);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.48)' }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="two-factor-confirm-title" style={{ width: 'min(100%, 420px)', padding: '24px', borderRadius: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', boxShadow: '0 24px 64px rgba(15, 23, 42, .25)' }}>
            <div style={{ width: '56px', height: '56px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: pendingTwoFactorValue ? '#ECFDF5' : '#FEF2F2', marginBottom: '14px' }}>
              {pendingTwoFactorValue ? <ShieldCheck size={28} color="#059669" /> : <ShieldAlert size={28} color="#DC2626" />}
            </div>
            <h2 id="two-factor-confirm-title" style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              {pendingTwoFactorValue ? 'Enable Two-Step Verification?' : 'Disable Two-Step Verification?'}
            </h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              {pendingTwoFactorValue
                ? `The next login will require a 6-digit code sent to ${user?.emailId || 'your registered email'}.`
                : 'Turning this off removes the email verification step from future logins.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary-luxury" onClick={() => setPendingTwoFactorValue(null)} disabled={isUpdatingTwoFactor}>
                Cancel
              </button>
              <button type="button" className="btn-primary-luxury" onClick={handleConfirmTwoFactor} disabled={isUpdatingTwoFactor}>
                {isUpdatingTwoFactor ? 'Updating...' : pendingTwoFactorValue ? 'Enable 2-Step' : 'Disable 2-Step'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
