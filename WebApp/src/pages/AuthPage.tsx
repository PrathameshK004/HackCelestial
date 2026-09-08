import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { AuthBrandShowcase } from '../components/auth/AuthBrandShowcase';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  initialMode = 'login',
  onAuthSuccess 
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  return (
    <div className="auth-fullscreen-navy-canvas">
      {/* Centered Main Card */}
      <div className="auth-card-modal-container">
        <div className="auth-card-modal-inner">
          {/* Left Column: Visual Hero Banner (Desktop) */}
          <div className="auth-hero-column">
            <AuthBrandShowcase />
          </div>

          {/* Right Column: Form View */}
          <div className="auth-form-column-modern">
            {/* Mobile Top Brand Header */}
            <div className="auth-mobile-brand-banner">
              <div className="auth-mobile-brand-icon-wrap">
                <Compass size={22} className="auth-mobile-brand-icon" />
              </div>
              <div className="auth-mobile-brand-text">
                <span className="auth-mobile-brand-pill">Trip Ledger</span>
                <h2 className="auth-mobile-brand-title">GroupTrip Ledger</h2>
              </div>
            </div>

            {/* Segmented Mode Switcher (Log In / Create Account) - shown when not in recovery */}
            {mode !== 'forgot' && (
              <div className="auth-segmented-pill-switcher" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  className={`auth-segment-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  className={`auth-segment-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => setMode('signup')}
                >
                  Create Account
                </button>
              </div>
            )}

            {mode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
                onForgotPassword={() => setMode('forgot')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : mode === 'signup' ? (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : (
              <ForgotPasswordForm
                onSwitchToLogin={() => setMode('login')}
                onSuccess={() => setMode('login')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
