import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, RotateCw, KeyRound, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccessRedirect?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccessRedirect }) => {
  const { registerTemp, verifyAndRegister, resendOtp } = useAuth();

  // Step 1: Input details, Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields matching reference layout
  const [fullName, setFullName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic Password Security Score
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '#e2e8f0' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#ef4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#f59e0b' };
      case 3:
        return { score: 3, label: 'Good', color: '#0284c7' };
      case 4:
      default:
        return { score: 4, label: 'Strong', color: '#059669' };
    }
  }, [password]);

  // OTP State (4 digits matching backend OTP generator)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Timer (30s fast-cycle)
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Status & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Step 1: Submit Form & Trigger OTP
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!emailId.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailId.trim())) {
      setErrorMessage('Please provide a valid email format');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerTemp({
        username: cleanName,
        emailId: emailId.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        setStep(2);
        setResendTimer(30);
        setCanResend(false);
        setOtpDigits(['', '', '', '']);
        setSuccessMessage(`A 4-digit verification code has been sent to ${emailId.trim().toLowerCase()}`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.message || 'Failed to initiate account creation. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during registration.');
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

    // Handle full paste into a single box
    if (cleanVal.length > 1) {
      const pastedChars = cleanVal.slice(0, 4).split('');
      const newDigits = [...otpDigits];
      pastedChars.forEach((char, idx) => {
        if (idx < 4) newDigits[idx] = char;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pastedChars.length, 3);
      otpInputRefs.current[nextIdx]?.focus();

      if (newDigits.every(d => d.trim().length === 1)) {
        setTimeout(() => submitVerification(newDigits.join('')), 100);
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal.slice(-1);
    setOtpDigits(newDigits);

    if (index < 3 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when 4th digit is entered
    if (newDigits.every(d => d.trim().length === 1)) {
      setTimeout(() => submitVerification(newDigits.join('')), 150);
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

    try {
      const res = await resendOtp(emailId.trim().toLowerCase(), 'Sign Up');
      if (res.success) {
        setResendTimer(30);
        setCanResend(false);
        setOtpDigits(['', '', '', '']);
        setSuccessMessage(`A fresh verification code was sent to ${emailId.trim().toLowerCase()}`);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(res.message || 'Could not resend code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Submit Verification Code - Gated strictly behind valid OTP
  const submitVerification = async (codeToVerify: string) => {
    if (isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = codeToVerify.trim();
    if (fullCode.length < 4) {
      setErrorMessage('Please enter the 4-digit verification code');
      return;
    }

    setIsLoading(true);
    const cleanName = fullName.trim();

    try {
      const res = await verifyAndRegister({
        username: cleanName,
        emailId: emailId.trim().toLowerCase(),
        password,
        code: fullCode,
      });

      if (res.success) {
        setSuccessMessage('OTP verified! Account created successfully. Redirecting...');
        setTimeout(() => {
          if (onSuccessRedirect) {
            onSuccessRedirect();
          }
        }, 300);
      } else {
        setErrorMessage(res.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Complete Registration Form Event
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitVerification(otpDigits.join(''));
  };

  return (
    <div className="auth-modern-form-pane">
      {/* Desktop Top back navigation */}
      <button 
        type="button" 
        className="auth-minimal-back-btn desktop-only-back-btn" 
        onClick={step === 2 ? () => setStep(1) : onSwitchToLogin}
        title={step === 2 ? 'Back to details' : 'Back to login'}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Main Title & Subtitle */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">
          {step === 1 ? 'Sign Up' : 'Verify Email'}
        </h1>
        <p className="auth-modern-subtitle">
          {step === 1 ? (
            'Create your account to get started with TripMate.'
          ) : (
            `Enter the 4-digit code sent to ${emailId}`
          )}
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
        /* STEP 1: REGISTRATION DETAILS */
        <form onSubmit={handleStep1Submit} className="auth-modern-form" noValidate>
          {/* Full Name Pill Input */}
          <div className="auth-field-group">
            <input
              id="signup-fullname"
              type="text"
              className="auth-modern-input auth-pill-input"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              required
              disabled={isLoading}
            />
          </div>

          {/* Email Address Pill Input */}
          <div className="auth-field-group">
            <input
              id="signup-email"
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

          {/* Password Pill Input */}
          <div className="auth-field-group">
            <div className="auth-input-relative-wrap">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-modern-input auth-pill-input has-right-btn"
                placeholder="Password (Min 6 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
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
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {/* Interactive Password Security Meter */}
            {password.length > 0 && (
              <div className="auth-password-strength-wrap">
                <div className="auth-strength-bars">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="auth-strength-bar"
                      style={{
                        backgroundColor: level <= passwordStrength.score ? passwordStrength.color : '#e2e8f0',
                      }}
                    />
                  ))}
                </div>
                <div className="auth-strength-meta-row">
                  <span className="auth-strength-label" style={{ color: passwordStrength.color }}>
                    Security: <strong>{passwordStrength.label}</strong>
                  </span>
                  <span className="auth-strength-hint">
                    {passwordStrength.score < 2
                      ? 'Min 6 characters'
                      : passwordStrength.score < 3
                      ? 'Add numbers/uppercase'
                      : passwordStrength.score < 4
                      ? 'Add special characters'
                      : 'Robust password'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Pill Input */}
          <div className="auth-field-group">
            <div className="auth-input-relative-wrap">
              <input
                id="signup-confirmpassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-modern-input auth-pill-input has-right-btn"
                placeholder="Confirm Password"
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
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {/* Create Account Primary Action Pill Button */}
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
              <span>Create Account</span>
            )}
          </button>

          {/* Divider */}
          <div className="auth-or-divider">
            <span>or</span>
          </div>

          {/* Social login buttons: Google & Phone side-by-side */}
          <div className="auth-social-grid">
            <button
              type="button"
              className="auth-social-pill-btn"
              onClick={() => setErrorMessage('Google SSO is configured for production domain.')}
            >
              <svg className="social-svg-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              className="auth-social-pill-btn"
              onClick={() => setErrorMessage('Phone verification is enabled in the mobile app.')}
            >
              <Phone size={16} />
              <span>Phone</span>
            </button>
          </div>

          {/* Bottom Switch Link */}
          <div className="auth-bottom-switch-row">
            <span>Already have an account?</span>
            <button 
              type="button" 
              className="auth-bold-link" 
              onClick={onSwitchToLogin}
            >
              Sign In
            </button>
          </div>
        </form>
      ) : (
        /* STEP 2: OTP CODE VERIFICATION */
        <form onSubmit={handleStep2Submit} className="auth-modern-form" noValidate>
          <div className="auth-otp-pane">
            <div className="auth-otp-badge">
              <KeyRound size={15} />
              <span className="auth-otp-email-text">{emailId}</span>
              <button
                type="button"
                className="auth-otp-edit-btn"
                onClick={() => setStep(1)}
              >
                Edit
              </button>
            </div>

            {/* 4 Digit Grid */}
            <div className="auth-otp-grid auth-otp-grid-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  className={`auth-otp-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={isLoading}
                  autoFocus={idx === 0}
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            {/* Resend Timer */}
            <div className="auth-otp-resend-row">
              {canResend ? (
                <button
                  type="button"
                  className="auth-resend-btn"
                  onClick={handleResendCode}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 size={14} className="spin-animation" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <RotateCw size={14} />
                      <span>Resend Verification Code</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="auth-timer-text">
                  Resend code in <strong>{resendTimer}s</strong>
                </span>
              )}
            </div>

            {/* Submit OTP */}
            <button
              type="submit"
              className="auth-black-pill-btn"
              disabled={isLoading || otpDigits.join('').length < 4}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin-animation" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Complete Registration</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
