import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { AuthBrandShowcase } from '../components/auth/AuthBrandShowcase';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  initialMode = 'login',
  onAuthSuccess 
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

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

            {/* Segmented Mode Switcher (Log In / Sign Up) */}
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

            {mode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setMode('signup')}
                onSuccessRedirect={onAuthSuccess}
              />
            ) : (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
                onSuccessRedirect={onAuthSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
