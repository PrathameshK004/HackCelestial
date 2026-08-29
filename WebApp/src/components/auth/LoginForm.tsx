import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleLoginButton } from './GoogleLoginButton';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword?: () => void;
  onSuccessRedirect?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToSignup,
  onSwitchToForgotPassword,
  onSuccessRedirect
}) => {
  const { login } = useAuth();

  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailId.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({
        emailId: emailId.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        setSuccessMessage('Welcome back! Loading trip workspace...');
        setTimeout(() => {
          if (onSuccessRedirect) {
            onSuccessRedirect();
          }
        }, 500);
      } else {
        setErrorMessage(res.message || 'Invalid email or password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please try again.');
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
        onClick={onSwitchToSignup}
        title="Switch to sign up"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Main Title & Switch link */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">Welcome Back</h1>
        <p className="auth-modern-subtitle">
          Don't have an account?{' '}
          <button 
            type="button" 
            className="auth-bold-link" 
            onClick={onSwitchToSignup}
          >
            Sign up
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

      <form onSubmit={handleSubmit} className="auth-modern-form" noValidate>
        {/* Email Address */}
        <div className="auth-field-group">
          <label htmlFor="login-email" className="auth-field-label">
            Email Address
          </label>
          <input
            id="login-email"
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
          <div className="auth-field-header-row">
            <label htmlFor="login-password" className="auth-field-label">
              Password
            </label>
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                if (onSwitchToForgotPassword) {
                  onSwitchToForgotPassword();
                } else {
                  setErrorMessage('Password recovery is available via email reset.');
                }
              }}
            >
              Forgot Password?
            </button>
          </div>
          <div className="auth-input-relative-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-modern-input has-right-btn"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              autoComplete="current-password"
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

        {/* Submit Button (Dark Pill) */}
        <button
          type="submit"
          className="auth-black-pill-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>

        {/* Remember me row */}
        <div className="auth-checkbox-row">
          <label className="auth-clean-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="auth-clean-checkbox"
            />
            <span className="auth-checkbox-text">
              Remember my session
            </span>
          </label>
        </div>

        {/* Divider */}
        <div className="auth-or-divider">
          <span>or</span>
        </div>

        {/* Social / Alternative buttons */}
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
    </div>
  );
};
