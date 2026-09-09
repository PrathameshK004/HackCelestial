import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, RotateCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSwitchToLogin,
  onSuccess
}) => {
  const { forgotPassword, resetPassword, resendOtp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [emailId, setEmailId] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend Timer
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailId.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(cleanEmail);
      if (res.success) {
        setStep(2);
        setResendTimer(60);
        setCanResend(false);
        setSuccessMessage(`We sent a 4-digit verification code to ${cleanEmail}`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res.message || 'No registered account found with this email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP inputs
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle full 4-digit paste
    if (cleanVal.length > 1) {
      const pastedChars = cleanVal.slice(0, 4).split('');
      const newDigits = [...otpDigits];
      pastedChars.forEach((char, idx) => {
        if (idx < 4) newDigits[idx] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pastedChars.length, 3);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);

    if (index < 3 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Resend
  const handleResendCode = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await resendOtp(emailId.trim().toLowerCase(), 'Password Reset');
      if (res.success) {
        setSuccessMessage('A fresh verification code has been sent!');
        setResendTimer(60);
        setCanResend(false);
      } else {
        setErrorMessage(res.message || 'Failed to resend code');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resending code');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit code');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({
        emailId: emailId.trim().toLowerCase(),
        code: fullOtp,
        newPassword,
      });

      if (res.success) {
        setSuccessMessage('Password reset successfully! Redirecting to Log In...');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            onSwitchToLogin();
          }
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modern-form-pane">
      {/* Top back navigation */}
      <button 
        type="button" 
        className="auth-minimal-back-btn" 
        onClick={step === 2 ? () => setStep(1) : onSwitchToLogin}
        title={step === 2 ? 'Change email' : 'Back to login'}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Main Title & Subtitle */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">
          {step === 1 ? 'Reset Password' : 'New Password'}
        </h1>
        <p className="auth-modern-subtitle">
          {step === 1 
            ? "Enter your registered email address and we'll send you a verification code."
            : `Enter the 4-digit code sent to your email and set your new password.`
          }
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

      {step === 1 ? (
        /* STEP 1: ENTER EMAIL */
        <form onSubmit={handleRequestOtp} className="auth-modern-form" noValidate>
          <div className="auth-field-group">
            <input
              id="forgot-email"
              type="email"
              className="auth-modern-input auth-pill-input"
              placeholder="Email Address"
              value={emailId}
              onChange={(e) => {
                setEmailId(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-blue-pill-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Sending Code...</span>
              </>
            ) : (
              <span>Send Verification Code</span>
            )}
          </button>

          <div className="auth-bottom-switch-row">
            <span>Remembered your password?</span>
            <button
              type="button"
              className="auth-bold-link"
              onClick={onSwitchToLogin}
            >
              Back to Log In
            </button>
          </div>
        </form>
      ) : (
        /* STEP 2: VERIFY OTP + SET NEW PASSWORD */
        <form onSubmit={handleResetPassword} className="auth-modern-form" noValidate>
          {/* Target Email Badge */}
          <div className="auth-otp-badge">
            <Mail size={15} />
            <span className="auth-otp-email-text">{emailId}</span>
            <button
              type="button"
              className="auth-otp-edit-btn"
              onClick={() => {
                setStep(1);
                setErrorMessage(null);
              }}
            >
              Change
            </button>
          </div>

          {/* 4-Box OTP Grid */}
          <div className="auth-field-group">
            <label className="auth-field-label" style={{ textAlign: 'center' }}>
              Enter 4-Digit Verification Code
            </label>
            <div className="auth-otp-grid auth-otp-grid-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className={`auth-otp-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
              ))}
            </div>
          </div>

          {/* New Password */}
          <div className="auth-field-group">
            <label htmlFor="reset-new-password" className="auth-field-label">
              New Password
            </label>
            <div className="auth-input-relative-wrap">
              <Lock size={18} className="auth-input-leading-icon" />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-modern-input has-left-icon has-right-btn"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="auth-eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="auth-field-group">
            <div className="auth-input-relative-wrap">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-modern-input auth-pill-input has-right-btn"
                placeholder="Confirm New Password"
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
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '14px' }}>
                <CheckCircle2 size={13} /> Passwords match
              </span>
            )}
          </div>

          {/* Resend Action */}
          <div className="auth-otp-resend-row">
            {canResend ? (
              <button
                type="button"
                className="auth-resend-btn"
                onClick={handleResendCode}
                disabled={isResending}
              >
                <RotateCw size={14} className={isResending ? 'spin-animation' : ''} />
                <span>{isResending ? 'Sending...' : 'Resend Verification Code'}</span>
              </button>
            ) : (
              <span className="auth-timer-text">
                Resend code in <strong>{resendTimer}s</strong>
              </span>
            )}
          </div>

          {/* Reset Action Button */}
          <button
            type="submit"
            className="auth-blue-pill-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Reset Password & Sign In</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
