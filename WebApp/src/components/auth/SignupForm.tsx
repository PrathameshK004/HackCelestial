import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccessRedirect?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccessRedirect }) => {
  const { register } = useAuth();

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Direct 1-Step Registration Submission (Industry Standard)
  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms & Condition');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        username: fullName,
        emailId: emailId.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        setSuccessMessage('Account created successfully! Redirecting to your workspace...');
        setTimeout(() => {
          if (onSuccessRedirect) {
            onSuccessRedirect();
          }
        }, 400);
      } else {
        setErrorMessage(res.message || 'Failed to create account. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during registration.');
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
        onClick={onSwitchToLogin}
        title="Back to login"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Main Title & Subtitle */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">Create an Account</h1>
        <p className="auth-modern-subtitle">
          Already have an account?{' '}
          <button 
            type="button" 
            className="auth-bold-link" 
            onClick={onSwitchToLogin}
          >
            Log in
          </button>
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

      {/* DIRECT 1-STEP REGISTRATION FORM */}
      <form onSubmit={handleSubmit} className="auth-modern-form" noValidate>
        {/* First Name & Last Name Grid */}
        <div className="auth-name-grid">
          <div className="auth-field-group">
            <label htmlFor="signup-firstname" className="auth-field-label">
              First Name
            </label>
            <div className="auth-input-relative-wrap">
              <User size={17} className="auth-input-leading-icon" />
              <input
                id="signup-firstname"
                type="text"
                className="auth-modern-input has-left-icon"
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
          </div>

          <div className="auth-field-group">
            <label htmlFor="signup-lastname" className="auth-field-label">
              Last Name
            </label>
            <div className="auth-input-relative-wrap">
              <User size={17} className="auth-input-leading-icon" />
              <input
                id="signup-lastname"
                type="text"
                className="auth-modern-input has-left-icon"
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
        </div>

        {/* Email Address */}
        <div className="auth-field-group">
          <label htmlFor="signup-email" className="auth-field-label">
            Email Address
          </label>
          <div className="auth-input-relative-wrap">
            <Mail size={18} className="auth-input-leading-icon" />
            <input
              id="signup-email"
              type="email"
              className="auth-modern-input has-left-icon"
              placeholder="name@example.com"
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
        </div>

        {/* Password */}
        <div className="auth-field-group">
          <label htmlFor="signup-password" className="auth-field-label">
            Password
          </label>
          <div className="auth-input-relative-wrap">
            <Lock size={18} className="auth-input-leading-icon" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-modern-input has-left-icon has-right-btn"
              placeholder="At least 6 characters"
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

        {/* Create Account Emerald Pill Button */}
        <button
          type="submit"
          className="auth-emerald-pill-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={17} />
            </>
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
          <button
            type="button"
            className="auth-social-btn"
            onClick={() => setErrorMessage('Google SSO is configured for production domain.')}
          >
            <svg className="social-svg-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            className="auth-social-btn"
            onClick={() => setErrorMessage('Facebook SSO is configured for production domain.')}
          >
            <svg className="social-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
          </button>
        </div>
      </form>
    </div>
  );
};
