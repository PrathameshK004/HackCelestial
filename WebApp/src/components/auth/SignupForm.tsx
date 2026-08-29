import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, RotateCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleLoginButton } from './GoogleLoginButton';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccessRedirect?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccessRedirect }) => {
  const { registerTemp, verifyAndRegister, resendOtp } = useAuth();

  // Step 1: Input details, Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP State (4 digits matching backend OTP generator)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Timer
  const [resendTimer, setResendTimer] = useState<number>(60);
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

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!fullName || fullName.length < 3) {
      setErrorMessage('Please enter your First and Last name (at least 3 characters)');
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
    if (!/^\w[\w.-]{1,}@[\w.-]+$/.test(upiId.trim())) {
      setErrorMessage('Please enter a valid UPI ID, for example name@bank');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms & Condition');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerTemp({
        username: fullName,
        emailId: emailId.trim().toLowerCase(),
        password,
        upiId: upiId.trim().toLowerCase(),
      });

      if (res.success) {
        setStep(2);
        setResendTimer(60);
        setCanResend(false);
        setSuccessMessage(`We sent a 4-digit verification code to ${emailId}`);
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

    try {
      const res = await resendOtp(emailId.trim().toLowerCase(), 'Sign Up');
      if (res.success) {
        setResendTimer(60);
        setCanResend(false);
        setSuccessMessage('A fresh verification code was sent to your email.');
      } else {
        setErrorMessage(res.message || 'Could not resend code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Complete Registration
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length < 4) {
      setErrorMessage('Please enter the 4-digit verification code');
      return;
    }

    setIsLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const res = await verifyAndRegister({
        username: fullName,
        emailId: emailId.trim().toLowerCase(),
        password,
        code: fullCode,
        upiId: upiId.trim().toLowerCase(),
      });

      if (res.success) {
        setSuccessMessage('Account verified! Redirecting to your workspace...');
        setTimeout(() => {
          if (onSuccessRedirect) {
            onSuccessRedirect();
          }
        }, 500);
      } else {
        setErrorMessage(res.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification error occurred.');
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
        title={step === 2 ? 'Back to details' : 'Back to login'}
      >
        <ArrowLeft size={20} />
      </button>

      {/* Main Title & Subtitle */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">
          {step === 1 ? 'Create an Account' : 'Verify Email'}
        </h1>
        <p className="auth-modern-subtitle">
          {step === 1 ? (
            <>
              Already have an account?{' '}
              <button 
                type="button" 
                className="auth-bold-link" 
                onClick={onSwitchToLogin}
              >
                Log in
              </button>
            </>
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
          {/* First Name & Last Name Grid */}
          <div className="auth-name-grid">
            <div className="auth-field-group">
              <label htmlFor="signup-firstname" className="auth-field-label">
                First Name
              </label>
              <input
                id="signup-firstname"
                type="text"
                className="auth-modern-input"
                placeholder="John"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isLoading}
              />
            </div>

            <div className="auth-field-group">
              <label htmlFor="signup-lastname" className="auth-field-label">
                Last Name
              </label>
              <input
                id="signup-lastname"
                type="text"
                className="auth-modern-input"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="auth-field-group">
            <label htmlFor="signup-email" className="auth-field-label">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              className="auth-modern-input"
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

          {/* Password */}
          <div className="auth-field-group">
            <label htmlFor="signup-password" className="auth-field-label">
              Password
            </label>
            <div className="auth-input-relative-wrap">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-modern-input has-right-btn"
                placeholder="Password"
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="signup-upi" className="auth-field-label">UPI ID</label>
            <input id="signup-upi" type="text" className="auth-modern-input" placeholder="name@bank" value={upiId} onChange={(e) => { setUpiId(e.target.value); if (errorMessage) setErrorMessage(null); }} autoComplete="off" required disabled={isLoading} />
          </div>

          {/* Create Account Dark Pill Button */}
          <button
            type="submit"
            className="auth-black-pill-btn"
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

          {/* Terms Checkbox */}
          <div className="auth-checkbox-row">
            <label className="auth-clean-checkbox-label">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="auth-clean-checkbox"
              />
              <span className="auth-checkbox-text">
                I agree to the <span className="auth-bold-underline">Terms & Condition</span>
              </span>
            </label>
          </div>

          {/* Divider */}
          <div className="auth-or-divider">
            <span>or</span>
          </div>

          {/* Social login buttons */}
          <div className="auth-social-grid">
            <GoogleLoginButton
              onSuccess={() => {
                setSuccessMessage('Welcome! Loading your trip workspace...');
                setTimeout(() => {
                  if (onSuccessRedirect) onSuccessRedirect();
                }, 400);
              }}
              onError={(err) => setErrorMessage(err)}
              disabled={isLoading}
            />
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
                <span>Complete Verification</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
