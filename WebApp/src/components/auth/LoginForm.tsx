import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword?: () => void;
  onSuccessRedirect?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSwitchToSignup, 
  onForgotPassword,
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

  const handleFillDemo = () => {
    setEmailId('yogesh@example.com');
    setPassword('Password@123');
    setErrorMessage(null);
  };

  return (
    <div className="auth-modern-form-pane">
      {/* Main Title & Subtitle */}
      <div className="auth-modern-header">
        <h1 className="auth-modern-title">Welcome Back</h1>
        <p className="auth-modern-subtitle">
          Sign in to access your trips, split expenses, and manage budgets.
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
        {/* Email Address with Leading Icon */}
        <div className="auth-field-group">
          <label htmlFor="login-email" className="auth-field-label">
            Email Address
          </label>
          <div className="auth-input-relative-wrap">
            <Mail size={18} className="auth-input-leading-icon" />
            <input
              id="login-email"
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

        {/* Password with Leading Icon & Eye Toggle */}
        <div className="auth-field-group">
          <label htmlFor="login-password" className="auth-field-label">
            Password
          </label>
          <div className="auth-input-relative-wrap">
            <Lock size={18} className="auth-input-leading-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-modern-input has-left-icon has-right-btn"
              placeholder="Enter your password"
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

        {/* Remember Me & Forgot Password in one clean aligned row */}
        <div className="auth-options-row">
          <label className="auth-clean-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="auth-clean-checkbox"
            />
            <span className="auth-checkbox-text">Remember me</span>
          </label>

          <button
            type="button"
            className="auth-forgot-link"
            onClick={onForgotPassword}
          >
            Forgot Password?
          </button>
        </div>

        {/* Emerald Action Button */}
        <button
          type="submit"
          className="auth-emerald-pill-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-animation" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* 1-Tap Quick Demo Fill Pill */}
        <button
          type="button"
          className="auth-demo-shortcut-btn"
          onClick={handleFillDemo}
          title="Auto-fill sample credentials for quick demo"
        >
          <Sparkles size={16} className="auth-demo-icon" />
          <span>Quick Demo Fill (yogesh@example.com)</span>
        </button>

        {/* Divider */}
        <div className="auth-or-divider">
          <span>or continue with</span>
        </div>

        {/* Social SSO Button */}
        <div className="auth-social-single-wrap">
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
        </div>

        {/* Bottom Switch Link */}
        <div className="auth-bottom-switch-row">
          <span>Don't have an account yet?</span>
          <button
            type="button"
            className="auth-bold-link"
            onClick={onSwitchToSignup}
          >
            Create an Account
          </button>
        </div>
      </form>
    </div>
  );
};
