import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { authService } from '../../services/auth.service';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onResetSuccess?: () => void;
}

type ResetStage = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  onResetSuccess
}) => {
  const [stage, setStage] = useState<ResetStage>('EMAIL');
  const [emailId, setEmailId] = useState('');
  
  // 6-digit OTP array
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-second Resend countdown timer
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    let timer: any;
    if (stage === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, countdown]);

  // Handle Stage 1: Send Reset OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = emailId.trim().toLowerCase();
    if (!email) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword({ emailId: email });
      setSuccessMessage(res.message || 'Reset code sent to your email.');
      setStage('OTP');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset code. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle Stage 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = otp.join('').trim();
    if (code.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.verifyResetOtp({
        emailId: emailId.trim().toLowerCase(),
        code
      });
      setSuccessMessage(res.message || 'Code verified. Create your new password.');
      setStage('NEW_PASSWORD');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.forgotPassword({ emailId: emailId.trim().toLowerCase() });
      setSuccessMessage(res.message || 'A fresh verification code has been sent.');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend code. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Stage 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const code = otp.join('').trim();
      const res = await authService.resetPassword({
        emailId: emailId.trim().toLowerCase(),
        code,
        newPassword
      });

      setSuccessMessage(res.message || 'Password successfully updated!');
      setStage('SUCCESS');
      if (onResetSuccess) {
        onResetSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength();

  return (
    <div className="auth-modern-form-pane">
      {/* Top back navigation */}
      <button
        type="button"
        className="auth-minimal-back-btn"
        onClick={() => {
          if (stage === 'OTP') setStage('EMAIL');
          else if (stage === 'NEW_PASSWORD') setStage('OTP');
          else onBackToLogin();
        }}
        title="Back"
      >
        <ArrowLeft size={20} />
      </button>

      {/* ---------------- STAGE 1: ENTER EMAIL ---------------- */}
      {stage === 'EMAIL' && (
        <>
          <div className="auth-modern-header">
            <h1 className="auth-modern-title">Reset Password</h1>
            <p className="auth-modern-subtitle">
              Enter your registered email address and we will send you a 6-digit recovery code.
            </p>
          </div>

          {errorMessage && (
            <div className="auth-modern-alert alert-error" role="alert">
              <AlertCircle size={17} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-modern-alert alert-success" role="alert">
              <CheckCircle2 size={17} className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSendOtp} className="auth-modern-form" noValidate>
            <div className="auth-field-group">
              <label htmlFor="reset-email" className="auth-field-label">
                Registered Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                className="auth-modern-input"
                placeholder="name@example.com"
                value={emailId}
                onChange={(e) => {
                  setEmailId(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoComplete="email"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="auth-black-pill-btn"
              disabled={isLoading || !emailId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin-animation" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Send Reset Code</span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                className="auth-switch-link"
                style={{ background: 'none', border: 'none', fontSize: '0.86rem' }}
                onClick={onBackToLogin}
              >
                Remember your password? Log in
              </button>
            </div>
          </form>
        </>
      )}

      {/* ---------------- STAGE 2: ENTER OTP ---------------- */}
      {stage === 'OTP' && (
        <>
          <div className="auth-modern-header">
            <h1 className="auth-modern-title">Enter Code</h1>
            <p className="auth-modern-subtitle">
              We sent a 6-digit recovery code to <strong>{emailId}</strong>.
            </p>
          </div>

          {errorMessage && (
            <div className="auth-modern-alert alert-error" role="alert">
              <AlertCircle size={17} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-modern-alert alert-success" role="alert">
              <CheckCircle2 size={17} className="alert-icon" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="auth-modern-form" noValidate>
            <div className="auth-field-group">
              <label className="auth-field-label" style={{ marginBottom: '8px' }}>
                6-Digit Verification Code
              </label>
              <div className="auth-otp-grid">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="auth-otp-box"
                    autoFocus={index === 0}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 16px 0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {canResend ? "Didn't get the code?" : `Resend code in ${countdown}s`}
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || isLoading}
                className="auth-switch-link"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.82rem',
                  opacity: canResend ? 1 : 0.5,
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={13} />
                <span>Resend Code</span>
              </button>
            </div>

            <button
              type="submit"
              className="auth-black-pill-btn"
              disabled={isLoading || otp.join('').length < 6}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin-animation" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>
          </form>
        </>
      )}

      {/* ---------------- STAGE 3: CREATE NEW PASSWORD ---------------- */}
      {stage === 'NEW_PASSWORD' && (
        <>
          <div className="auth-modern-header">
            <h1 className="auth-modern-title">New Password</h1>
            <p className="auth-modern-subtitle">
              Choose a strong password to secure your account.
            </p>
          </div>

          {errorMessage && (
            <div className="auth-modern-alert alert-error" role="alert">
              <AlertCircle size={17} className="alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="auth-modern-form" noValidate>
            {/* New Password */}
            <div className="auth-field-group">
              <label htmlFor="new-password" className="auth-field-label">
                New Password
              </label>
              <div className="auth-input-relative-wrap">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-modern-input has-right-btn"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  className="auth-eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ flex: 1, background: strengthScore >= 1 ? '#e11d48' : '#e2e8f0' }} />
                    <div style={{ flex: 1, background: strengthScore >= 2 ? '#d97706' : '#e2e8f0' }} />
                    <div style={{ flex: 1, background: strengthScore >= 3 ? '#10b981' : '#e2e8f0' }} />
                    <div style={{ flex: 1, background: strengthScore >= 4 ? '#059669' : '#e2e8f0' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                    Strength: {strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : strengthScore === 3 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="auth-field-group">
              <label htmlFor="confirm-new-password" className="auth-field-label">
                Confirm New Password
              </label>
              <div className="auth-input-relative-wrap">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-modern-input has-right-btn"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-black-pill-btn"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin-animation" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        </>
      )}

      {/* ---------------- STAGE 4: SUCCESS ---------------- */}
      {stage === 'SUCCESS' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #a7f3d0',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px auto'
            }}
          >
            <CheckCircle2 size={36} strokeWidth={2.4} />
          </div>

          <h1 className="auth-modern-title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
            Password Reset
          </h1>
          <p className="auth-modern-subtitle" style={{ marginBottom: '24px' }}>
            Your account password has been updated securely. All other active sessions have been revoked.
          </p>

          <button
            type="button"
            className="auth-black-pill-btn"
            onClick={onBackToLogin}
          >
            Log In with New Password
          </button>
        </div>
      )}
    </div>
  );
};
